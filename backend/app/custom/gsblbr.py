"""Research replica of the six-factor GS Bull/Bear Market Indicator.

This is an explicitly labelled approximation, not Goldman Sachs' proprietary
series.  It follows the article's public description: six equally weighted
historical percentiles, with the private-balance factor kept as a documented
proxy.  The endpoint stores a refreshable snapshot under the normal runtime
data directory instead of fetching remote data on every chart request.
"""
from __future__ import annotations

import csv
import io
import json
import logging
import math
import threading
from collections.abc import Callable, Mapping
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from typing import Annotated, Any
from urllib.parse import urljoin, urlsplit

import httpx
import polars as pl
from fastapi import APIRouter, HTTPException, Query, Request

from app.extensions import BACKEND_EXTENSION_API_VERSION, BackendExtensionRegistrar

logger = logging.getLogger(__name__)

EXTENSION_ID = "research.gsblbr"
EXTENSION_API_VERSION = BACKEND_EXTENSION_API_VERSION

_DATA_FILE = "gsblbr-replica.json"
_SHILLER_URL = "https://shillerdata.com/"
_OFFICIAL_URL = "https://hanshu123.com/assets/gsblbr-v1-data.json?v=20260828-private-mask-v1"
_FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={}"
_USER_AGENT = "tickflow-stock-panel/research-gsblbr"
_SNAPSHOT_VERSION = 3

_FACTOR_ORDER = (
    "cape",
    "yield_curve",
    "manufacturing",
    "private_balance",
    "core_inflation",
    "unemployment",
)
_INVERSE_FACTORS = {"yield_curve", "private_balance", "unemployment"}
_SAMPLE_STARTS = {
    "cape": "1950-01-01",
    "yield_curve": "1950-01-01",
    "manufacturing": "1972-01-01",
    "private_balance": "1947-01-01",
    "core_inflation": "1960-01-01",
    "unemployment": "1948-01-01",
}

FRED_SOURCES = {
    "yield_long": "GS10",
    "yield_short": "TB3MS",
    "manufacturing": "IPMAN",
    "core_cpi": "CPILFESL",
    "unemployment": "UNRATE",
    "private_saving": "GPSAVE",
    "private_investment": "GPDI",
    "gdp": "GDP",
}

_build_lock = threading.Lock()
_payload_lock = threading.Lock()
_payload_cache: tuple[Path, int, dict[str, Any]] | None = None


def _finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _month_key(value: str) -> str:
    """Normalise a source date to the first day of its month."""
    return f"{value[:7]}-01"


def _add_months(value: str, months: int) -> str:
    current = date.fromisoformat(_month_key(value))
    index = current.year * 12 + current.month - 1 + months
    return f"{index // 12:04d}-{index % 12 + 1:02d}-01"


def _month_range(start: str, end: str) -> list[str]:
    start_date = date.fromisoformat(_month_key(start))
    end_date = date.fromisoformat(_month_key(end))
    result: list[str] = []
    cursor = start_date.year * 12 + start_date.month - 1
    finish = end_date.year * 12 + end_date.month - 1
    while cursor <= finish:
        result.append(f"{cursor // 12:04d}-{cursor % 12 + 1:02d}-01")
        cursor += 1
    return result


def percentile_rank(values: list[float], value: float, *, inverse: bool = False) -> float:
    """Return a midrank percentile scaled to [0, 100].

    A high value means higher risk unless ``inverse`` is true.  The min/max
    scaling makes the endpoints 0 and 100 while giving ties their midpoint.
    """
    clean = sorted(item for item in values if math.isfinite(item))
    if not clean:
        raise ValueError("percentile rank needs at least one finite value")
    if len(clean) == 1:
        return 50.0
    lower = sum(item < value for item in clean)
    equal = sum(item == value for item in clean)
    ascending = (lower + equal / 2 - 0.5) / (len(clean) - 1) * 100
    score = 100 - ascending if inverse else ascending
    return round(max(0.0, min(100.0, score)), 4)


def build_private_balance_series(
    *,
    saving: Mapping[str, Any],
    investment: Mapping[str, Any],
    gdp: Mapping[str, Any],
) -> dict[str, float]:
    """Build (gross private saving - investment) / GDP, 4Q mean.

    A quarter's three BEA inputs are first usable in the month of the GDP
    second estimate (four months after the quarter's first month). This is
    an availability approximation, not a historical release-vintage record.
    """
    quarterly: list[tuple[str, float]] = []
    for key in sorted(set(saving) & set(investment) & set(gdp)):
        saved = _finite(saving[key])
        invested = _finite(investment[key])
        gross_domestic_product = _finite(gdp[key])
        if saved is None or invested is None or not gross_domestic_product:
            continue
        quarterly.append((_month_key(key), (saved - invested) / gross_domestic_product * 100))

    result: dict[str, float] = {}
    for index in range(3, len(quarterly)):
        average = sum(value for _, value in quarterly[index - 3 : index + 1]) / 4
        result[_add_months(quarterly[index][0], 4)] = round(average, 6)
    return result


def _forward_fill(series: Mapping[str, float], dates: list[str]) -> dict[str, float | None]:
    ordered = sorted((_month_key(key), value) for key, value in series.items())
    index = 0
    latest: float | None = None
    result: dict[str, float | None] = {}
    for current in dates:
        while index < len(ordered) and ordered[index][0] <= current:
            latest = ordered[index][1]
            index += 1
        result[current] = latest
    return result


def compute_gsblbr_series(
    *,
    cape: Mapping[str, Any],
    yield_curve: Mapping[str, Any],
    manufacturing: Mapping[str, Any],
    private_balance: Mapping[str, Any],
    core_inflation: Mapping[str, Any],
    unemployment: Mapping[str, Any],
) -> list[dict[str, float | str]]:
    """Align six monthly inputs and compute an equal-weight risk score."""
    raw = {
        name: {
            _month_key(key): value
            for key, item in source.items()
            if (value := _finite(item)) is not None
        }
        for name, source in {
            "cape": cape,
            "yield_curve": yield_curve,
            "manufacturing": manufacturing,
            "private_balance": private_balance,
            "core_inflation": core_inflation,
            "unemployment": unemployment,
        }.items()
    }
    if any(not source for source in raw.values()):
        return []

    starts = [min(source) for source in raw.values()]
    ends = [max(source) for source in raw.values()]
    start = max(starts)
    end = min(ends)
    if start > end:
        return []
    dates = _month_range(start, end)
    aligned = {name: _forward_fill(source, dates) for name, source in raw.items()}

    distributions = {
        name: [value for key, value in source.items() if key >= _SAMPLE_STARTS[name]]
        for name, source in raw.items()
    }
    rows: list[dict[str, float | str]] = []
    for current in dates:
        values = {name: aligned[name][current] for name in _FACTOR_ORDER}
        if any(value is None for value in values.values()):
            continue
        row: dict[str, float | str] = {"date": current}
        scores: list[float] = []
        for name in _FACTOR_ORDER:
            value = float(values[name])  # guarded by the None check above
            score = percentile_rank(
                distributions[name], value, inverse=name in _INVERSE_FACTORS
            )
            row[name] = round(value, 6)
            row[f"{name}_score"] = score
            scores.append(score)
        row["score"] = round(sum(scores) / len(scores), 4)
        rows.append(row)
    return rows


def _fetch_bytes(url: str) -> bytes:
    response = httpx.get(url, headers={"User-Agent": _USER_AGENT}, timeout=30, follow_redirects=True)
    response.raise_for_status()
    return response.content


def _fetch_text(url: str) -> str:
    return _fetch_bytes(url).decode("utf-8-sig")


def _fetch_json(url: str) -> Any:
    return json.loads(_fetch_text(url))


def _parse_fred_csv(body: str, series_id: str) -> dict[str, float]:
    result: dict[str, float] = {}
    for row in csv.DictReader(io.StringIO(body)):
        value = _finite(row.get(series_id))
        observation_date = row.get("observation_date")
        if value is not None and observation_date:
            result[_month_key(observation_date)] = value
    return result


class _ShillerLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.url: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        href = dict(attrs).get("href")
        if href and urlsplit(href).path.endswith("/ie_data.xls"):
            self.url = href


def _shiller_workbook_url(html: str) -> str:
    parser = _ShillerLinkParser()
    parser.feed(html)
    if not parser.url:
        raise ValueError("Shiller workbook link unavailable")
    url = urljoin(_SHILLER_URL, parser.url)
    if urlsplit(url).scheme != "https":
        raise ValueError("Shiller workbook URL must use HTTPS")
    return url


def _parse_shiller_cape(workbook: bytes) -> dict[str, float]:
    try:
        frame = pl.read_excel(
            io.BytesIO(workbook),
            sheet_name="Data",
            columns=["Date", "CAPE"],
            read_options={"header_row": 7},
            schema_overrides={"CAPE": pl.String},
        )
    except Exception as exc:
        raise ValueError("invalid Shiller workbook") from exc
    result: dict[str, float] = {}
    for raw_date, raw_cape in frame.iter_rows():
        numeric_date = _finite(raw_date)
        value = _finite(raw_cape)
        if numeric_date is None or value is None:
            continue
        year = int(numeric_date)
        month = round((numeric_date - year) * 100)
        if 1 <= month <= 12:
            result[f"{year:04d}-{month:02d}-01"] = value
    return result


def _parse_official_series(payload: Any) -> list[dict[str, float | str]]:
    """Extract the third-party public comparison field ``o`` from the site JSON."""
    source_rows = payload.get("series", []) if isinstance(payload, dict) else []
    result: list[dict[str, float | str]] = []
    for row in source_rows:
        if not isinstance(row, dict):
            continue
        value = _finite(row.get("o"))
        observation_date = row.get("d")
        if value is not None and observation_date:
            result.append({"date": str(observation_date), "value": round(value, 6)})
    return sorted(result, key=lambda item: str(item["date"]))


def build_snapshot(
    *,
    fetch_text: Callable[[str], str] = _fetch_text,
    fetch_json: Callable[[str], Any] = _fetch_json,
    fetch_bytes: Callable[[str], bytes] = _fetch_bytes,
) -> dict[str, Any]:
    """Fetch public sources once and return a serialisable replica payload."""
    fred: dict[str, dict[str, float]] = {}
    for name, series_id in FRED_SOURCES.items():
        fred[name] = _parse_fred_csv(fetch_text(_FRED_URL.format(series_id)), series_id)

    cape = _parse_shiller_cape(fetch_bytes(_shiller_workbook_url(fetch_text(_SHILLER_URL))))
    official_series = _parse_official_series(fetch_json(_OFFICIAL_URL))
    yield_curve = {
        key: fred["yield_long"][key] - fred["yield_short"][key]
        for key in set(fred["yield_long"]) & set(fred["yield_short"])
    }
    core_cpi = fred["core_cpi"]
    core_inflation = {
        key: (value / core_cpi[_add_months(key, -12)] - 1) * 100
        for key, value in core_cpi.items()
        if _add_months(key, -12) in core_cpi and core_cpi[_add_months(key, -12)]
    }
    private_balance = build_private_balance_series(
        saving=fred["private_saving"],
        investment=fred["private_investment"],
        gdp=fred["gdp"],
    )
    monthly_end = min(
        max(cape), max(yield_curve), max(fred["manufacturing"]),
        max(core_inflation), max(fred["unemployment"]),
    )
    private_balance = {key: value for key, value in private_balance.items() if key <= monthly_end}
    if private_balance and max(private_balance) < monthly_end:
        private_balance[monthly_end] = private_balance[max(private_balance)]
    rows = compute_gsblbr_series(
        cape=cape,
        yield_curve=yield_curve,
        manufacturing=fred["manufacturing"],
        private_balance=private_balance,
        core_inflation=core_inflation,
        unemployment=fred["unemployment"],
    )
    if not rows:
        raise ValueError("six-factor sources have no overlapping monthly observations")

    return {
        "snapshot_version": _SNAPSHOT_VERSION,
        "model": "GSBLBR six-factor research replica",
        "status": "approximate",
        "start": rows[0]["date"],
        "end": rows[-1]["date"],
        "updated_at": date.today().isoformat(),
        "latest": rows[-1],
        "series": rows,
        "official_series": official_series,
        "methodology": {
            "weights": {name: round(1 / len(_FACTOR_ORDER), 4) for name in _FACTOR_ORDER},
            "percentile": "full-sample midrank, scaled to 0-100",
            "inverse_risk_factors": sorted(_INVERSE_FACTORS),
            "sample_starts": _SAMPLE_STARTS,
            "manufacturing_note": "IPMAN manufacturing industrial production proxy; not ISM PMI",
            "private_balance_note": "(GPSAVE - GPDI) / GDP, four-quarter mean; first available in second-estimate month, then carried forward",
        },
        "sources": {
            "cape": {
                "series": "Shiller CAPE",
                "url": _SHILLER_URL,
                "publisher": "Robert Shiller",
            },
            "yield_curve": {
                "series": "GS10 - TB3MS",
                "url": "https://fred.stlouisfed.org/series/GS10",
                "publisher": "Federal Reserve Bank of St. Louis via FRED",
            },
            "manufacturing": {
                "series": "IPMAN",
                "url": "https://fred.stlouisfed.org/series/IPMAN",
                "publisher": "Federal Reserve Bank of St. Louis via FRED",
            },
            "private_balance": {
                "series": "GPSAVE, GPDI, GDP",
                "url": "https://fred.stlouisfed.org/series/GPSAVE",
                "publisher": "U.S. Bureau of Economic Analysis via FRED",
            },
            "core_inflation": {
                "series": "CPILFESL YoY",
                "url": "https://fred.stlouisfed.org/series/CPILFESL",
                "publisher": "U.S. Bureau of Labor Statistics via FRED",
            },
            "unemployment": {
                "series": "UNRATE",
                "url": "https://fred.stlouisfed.org/series/UNRATE",
                "publisher": "U.S. Bureau of Labor Statistics via FRED",
            },
            "official": {
                "series": "GSBLBR public comparison field o",
                "url": _OFFICIAL_URL,
                "publisher": "hanshu123.com public comparison dataset",
            },
        },
    }


def _data_path(request: Request) -> Path:
    return Path(request.app.state.repo.store.data_dir) / "user_data" / _DATA_FILE


def _read_payload(path: Path) -> dict[str, Any]:
    global _payload_cache
    stamp = path.stat().st_mtime_ns
    with _payload_lock:
        if _payload_cache and _payload_cache[0] == path and _payload_cache[1] == stamp:
            return _payload_cache[2]
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict) or not isinstance(payload.get("series"), list):
            raise ValueError("invalid GSBLBR replica snapshot")
        _payload_cache = (path, stamp, payload)
        return payload


def _write_payload(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)
    with _payload_lock:
        global _payload_cache
        _payload_cache = None


def _load_or_build(path: Path) -> dict[str, Any]:
    if path.exists():
        payload = _read_payload(path)
        if payload.get("snapshot_version") == _SNAPSHOT_VERSION:
            return payload
    with _build_lock:
        if path.exists():
            payload = _read_payload(path)
            if payload.get("snapshot_version") == _SNAPSHOT_VERSION:
                return payload
        payload = build_snapshot()
        _write_payload(path, payload)
        return payload


router = APIRouter(prefix="/api/gsblbr", tags=["gsblbr"])


@router.get("/history")
def history(
    request: Request,
    start: Annotated[date | None, Query()] = None,
    end: Annotated[date | None, Query()] = None,
) -> dict[str, Any]:
    if start and end and start > end:
        raise HTTPException(status_code=400, detail="start must not be after end")
    try:
        payload = _load_or_build(_data_path(request))
    except (OSError, ValueError, httpx.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning("GSBLBR replica unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="GSBLBR replica data unavailable") from exc

    rows = payload["series"]
    filtered = [
        row
        for row in rows
        if (not start or row["date"] >= start.isoformat())
        and (not end or row["date"] <= end.isoformat())
    ]
    return {**payload, "series": filtered, "total": len(filtered)}


@router.post("/refresh")
def refresh(request: Request) -> dict[str, Any]:
    try:
        with _build_lock:
            payload = build_snapshot()
            _write_payload(_data_path(request), payload)
    except (OSError, ValueError, httpx.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning("GSBLBR refresh failed: %s", exc)
        raise HTTPException(status_code=503, detail="GSBLBR refresh failed") from exc
    return {
        "ok": True,
        "start": payload["start"],
        "end": payload["end"],
        "updated_at": payload["updated_at"],
        "rows": len(payload["series"]),
    }


def setup(registrar: BackendExtensionRegistrar) -> None:
    registrar.include_router(router)
