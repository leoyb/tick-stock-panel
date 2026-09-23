"""Unified US-market macro/leading-indicator data from hanshu123.com.

The upstream site exposes some data as JSON/CSV assets and the macro dashboard
as an embedded JSON document inside ``macro-dashboard-panel.html``.  This
module turns those sources into one small, date-filterable API so other app
pages do not need to know the upstream asset layout.
"""
from __future__ import annotations

import csv
import io
import json
import logging
import math
import re
import threading
from collections.abc import Callable, Mapping
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, HTTPException, Query, Request

from app.extensions import BACKEND_EXTENSION_API_VERSION, BackendExtensionRegistrar

logger = logging.getLogger(__name__)

EXTENSION_ID = "research.us-market"
EXTENSION_API_VERSION = BACKEND_EXTENSION_API_VERSION

_DATA_FILE = "us-market-snapshot.json"
_SNAPSHOT_VERSION = 3
_USER_AGENT = "tickflow-stock-panel/us-market"
_MACRO_URL = (
    "https://hanshu123.com/assets/macro-dashboard-panel.html?compact=1&layout=macro-grid"
    "&id=us-market&panels=index,valuation,eps,sales,operating-margin,rates,"
    "pmi-manufacturing,pmi-composite,sp500-m2,margin-debt-yoy,margin-debt-gdp,"
    "nfci-stress,ofr-fsi,gsblbr-v1&v=20260829-private-site-v2"
)
_SOURCE_URLS = {
    "macro": _MACRO_URL,
    "financial_stress": "https://hanshu123.com/assets/financial-stress-data.json?v=20260825-financial-stress-v1",
    "gsblbr": "https://hanshu123.com/assets/gsblbr-v1-data.json?v=20260828-private-mask-v1",
    "global_rate_cuts": "https://hanshu123.com/assets/global-rate-cuts-data.json?v=20260824-last-move-v1",
    "ism_lead": "https://hanshu123.com/assets/ism-lead-data.json?v=20260821-ism-lead",
    "earnings_lead": "https://hanshu123.com/assets/earnings-lead-data.json?v=20260828-private-mask-v1",
    "nfci_sp500": "https://hanshu123.com/assets/nfci-sp500-yoy-data.json?v=20260825-nfci-lead18-v1",
    "regional_fed": "https://hanshu123.com/assets/regional-fed-orders-inventory-data.json?v=20260828-private-mask-v1",
    "philly_fed": "https://hanshu123.com/assets/philly-fed-ism-lead-data.json?v=20260827-philly-fed-gaf-lead6-pmi1965",
    "community": "https://hanshu123.com/assets/community-lead-indicator-1.csv?v=20260828-lead11-mask12",
    "global_liquidity": "https://hanshu123.com/assets/global-liquidity-pine-exact-v3.csv?v=20260828-private-mask-v1",
    "liquidity_asset": "https://hanshu123.com/assets/liquidity-asset-lead-data.json?v=20260831-liquidity-chart-refresh-v1",
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


def _normalise_date(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value)[:10]
    if len(text) == 7:
        return f"{text}-01"
    return text if len(text) == 10 else None


def _add_months(value: str, months: int) -> str:
    current = date.fromisoformat(value[:10].replace("/", "-"))
    index = current.year * 12 + current.month - 1 + months
    return f"{index // 12:04d}-{index % 12 + 1:02d}-01"


def _fetch_text(url: str) -> str:
    response = httpx.get(url, headers={"User-Agent": _USER_AGENT}, timeout=30, follow_redirects=True)
    response.raise_for_status()
    return response.content.decode("utf-8-sig")


def _fetch_json(url: str) -> Any:
    return json.loads(_fetch_text(url))


def _parse_macro_panel_html(body: str) -> dict[str, Any]:
    match = re.search(
        r'<script[^>]*id=["\']sp500-five-panel-data["\'][^>]*>(.*?)</script>',
        body,
        flags=re.DOTALL,
    )
    if not match:
        raise ValueError("hanshu macro panel JSON not found")
    payload = json.loads(match.group(1).strip())
    if not isinstance(payload, dict):
        raise ValueError("hanshu macro panel JSON is not an object")
    return payload


def _parse_csv(body: str) -> list[dict[str, str]]:
    return list(csv.DictReader(io.StringIO(body)))


def _points(
    rows: list[Mapping[str, Any]],
    date_key: str,
    value_key: str,
    *,
    shift_months: int = 0,
    transform: Callable[[float], float] | None = None,
) -> list[dict[str, float | str]]:
    result: list[dict[str, float | str]] = []
    for row in rows:
        observation_date = _normalise_date(row.get(date_key))
        value = _finite(row.get(value_key))
        if observation_date is None or value is None:
            continue
        if shift_months:
            observation_date = _add_months(observation_date, shift_months)
        if transform is not None:
            value = transform(value)
        result.append({"date": observation_date, "value": round(value, 8)})
    return sorted(result, key=lambda item: str(item["date"]))


def _series(
    key: str,
    label: str,
    points: list[dict[str, float | str]],
    *,
    axis: str = "left",
    unit: str = "",
) -> dict[str, Any]:
    return {"key": key, "label": label, "axis": axis, "unit": unit, "points": points}


def _panel(
    panel_id: str,
    group: str,
    title: str,
    description: str,
    source_url: str,
    series: list[dict[str, Any]],
) -> dict[str, Any]:
    valid_series = [item for item in series if item["points"]]
    dates = [str(point["date"]) for item in valid_series for point in item["points"]]
    return {
        "id": panel_id,
        "group": group,
        "title": title,
        "description": description,
        "frequency": "源站原始频率",
        "source_url": source_url,
        "series": valid_series,
        "start": min(dates) if dates else None,
        "end": max(dates) if dates else None,
    }


def _yoy_points(rows: list[Mapping[str, Any]], date_key: str, value_key: str) -> list[dict[str, float | str]]:
    values: dict[str, float] = {}
    for row in rows:
        observation_date = _normalise_date(row.get(date_key))
        value = _finite(row.get(value_key))
        if observation_date is not None and value is not None:
            values[observation_date] = value
    result: list[dict[str, float | str]] = []
    for observation_date, value in sorted(values.items()):
        prior_date = _add_months(observation_date, -12)
        prior = values.get(prior_date)
        if prior is not None and prior:
            result.append({"date": observation_date, "value": round((value / prior - 1) * 100, 8)})
    return result


def _build_macro_panels(
    raw: Mapping[str, Any],
    financial: Mapping[str, Any],
    gsblbr: Mapping[str, Any],
) -> list[dict[str, Any]]:
    source = _SOURCE_URLS["macro"]
    panels = [
        _panel(
            "macro.index",
            "macro",
            "标普 500 与同比",
            "标普 500 月末收盘及其 12 个月同比。",
            source,
            [
                _series("sp500", "标普 500", _points(raw.get("index", []), "d", "p"), unit="指数"),
                _series("sp500_yoy", "标普 500 同比", _points(raw.get("index", []), "d", "y"), axis="right", unit="%"),
            ],
        ),
        _panel(
            "macro.valuation",
            "macro",
            "估值: CAPE 与前瞻市盈率",
            "公开面板中的 Shiller CAPE 和前瞻市盈率。",
            source,
            [
                _series("cape", "Shiller CAPE", _points(raw.get("cape", []), "d", "v"), unit="倍"),
                _series("forward_pe", "前瞻市盈率", _points(raw.get("forward", []), "d", "pe"), unit="倍"),
            ],
        ),
        _panel(
            "macro.eps",
            "macro",
            "实际盈利与前瞻盈利同比",
            "标普 500 已报告盈利同比与非当前期前瞻盈利同比。",
            source,
            [
                _series("reported_eps_yoy", "实际盈利同比", _points(raw.get("reported", []), "d", "y"), unit="%"),
                _series(
                    "forward_eps_yoy",
                    "前瞻 EPS 同比",
                    _points([row for row in raw.get("forward", []) if row.get("c") is not True], "d", "y"),
                    unit="%",
                ),
            ],
        ),
        _panel(
            "macro.sales",
            "macro",
            "销售同比",
            "标普 500 销售同比。",
            source,
            [_series("sales_yoy", "销售同比", _points(raw.get("salesYoy", []), "d", "v"), unit="%")],
        ),
        _panel(
            "macro.operating_margin",
            "macro",
            "经营利润率",
            "实际与估算经营利润率。",
            source,
            [
                _series("operating_margin_actual", "实际经营利润率", _points([row for row in raw.get("operatingMargin", []) if row.get("s") == "actual"], "d", "v"), unit="%"),
                _series("operating_margin_estimate", "估算经营利润率", _points([row for row in raw.get("operatingMargin", []) if row.get("s") == "estimate"], "d", "v"), unit="%"),
            ],
        ),
        _panel(
            "macro.rates",
            "macro",
            "利率与债券收益率",
            "2 年期、10 年期国债收益率和政策利率。",
            source,
            [
                _series("yield_2y", "2 年期国债", _points(raw.get("yield2y", []), "d", "v"), unit="%"),
                _series("yield_10y", "10 年期国债", _points(raw.get("yield10y", []), "d", "v"), unit="%"),
                _series("policy_rate", "政策利率", _points(raw.get("policy", []), "d", "v"), unit="%"),
            ],
        ),
        _panel(
            "macro.pmi_manufacturing",
            "macro",
            "制造业 PMI 与标普 500 同比",
            "制造业 PMI 与标普 500 同比。",
            source,
            [
                _series("pmi", "制造业 PMI", _points(raw.get("pmi", []), "d", "v"), unit="点"),
                _series("sp500_yoy", "标普 500 同比", _points(raw.get("index", []), "d", "y"), axis="right", unit="%"),
            ],
        ),
        _panel(
            "macro.pmi_composite",
            "macro",
            "制造业与服务业 PMI 平均",
            "制造业 PMI、服务业 PMI 简单平均及标普 500 同比。",
            source,
            [
                _series("pmi_average", "PMI 简单平均", _points(raw.get("pmiAverage", []), "d", "v"), unit="点"),
                _series("sp500_yoy", "标普 500 同比", _points(raw.get("index", []), "d", "y"), axis="right", unit="%"),
            ],
        ),
        _panel(
            "macro.sp500_m2",
            "macro",
            "标普 500 ÷ 美国 M2",
            "标普 500 指数除以美国 M2 的月度比值。",
            source,
            [_series("sp500_m2", "标普 500 ÷ M2", _points(raw.get("sp500M2Ratio", []), "d", "v"), unit="比值")],
        ),
        _panel(
            "macro.margin_debt_yoy",
            "macro",
            "融资余额同比",
            "美国证券融资余额同比增速。",
            source,
            [_series("margin_debt_yoy", "融资余额同比", _points(raw.get("marginDebtYoy", []), "d", "v"), unit="%")],
        ),
        _panel(
            "macro.margin_debt_gdp",
            "macro",
            "融资余额 ÷ 名义 GDP",
            "美国证券融资余额占名义 GDP 的比例。",
            source,
            [_series("margin_debt_gdp", "融资余额 ÷ 名义 GDP", _points(raw.get("marginDebtGdpRatio", []), "d", "v"), unit="%")],
        ),
        _panel(
            "macro.aaii_sentiment",
            "macro",
            "AAII 投资者情绪",
            "看多、观望、看空比例及多空差。",
            source,
            [
                _series("bull", "看多", _points(raw.get("aaiiSentiment", []), "d", "bull"), unit="%"),
                _series("neutral", "观望", _points(raw.get("aaiiSentiment", []), "d", "neutral"), unit="%"),
                _series("bear", "看空", _points(raw.get("aaiiSentiment", []), "d", "bear"), unit="%"),
                _series("spread", "多空差", _points(raw.get("aaiiSentiment", []), "d", "spread"), axis="right", unit="%"),
            ],
        ),
        _panel(
            "macro.nfci",
            "macro",
            "芝加哥联储 NFCI",
            "芝加哥联储全国金融状况指数官方原值。",
            _SOURCE_URLS["financial_stress"],
            [_series("nfci", "NFCI 官方原值", _points(financial.get("nfci", {}).get("series", []), "date", "value"), unit="")],
        ),
        _panel(
            "macro.ofr_fsi",
            "macro",
            "全球 OFR 金融压力指数",
            "全球总指数及美国、其他发达经济体、新兴市场贡献。",
            _SOURCE_URLS["financial_stress"],
            [
                _series("global", "Global / OFR FSI", _points(financial.get("ofrFsi", {}).get("series", []), "date", "global")),
                _series("us", "US 地区贡献", _points(financial.get("ofrFsi", {}).get("series", []), "date", "us")),
                _series("other_advanced", "其他发达经济体", _points(financial.get("ofrFsi", {}).get("series", []), "date", "otherAdvanced")),
                _series("emerging", "新兴市场", _points(financial.get("ofrFsi", {}).get("series", []), "date", "emerging")),
            ],
        ),
        _panel(
            "gsblbr",
            "gsblbr",
            "GSBLBR 原版与复刻版",
            "站点公开数据中的原版 o 与复刻版 v; 公开遮罩后的日期不补值。",
            _SOURCE_URLS["gsblbr"],
            [
                _series("official", "高盛原版(公开)", _points(gsblbr.get("series", []), "d", "o"), unit="分"),
                _series("replica", "GSBLBR V1 复刻", _points(gsblbr.get("series", []), "d", "v"), unit="分"),
            ],
        ),
    ]
    return [panel for panel in panels if panel["series"]]


def _build_leading_panels(
    rate_cuts: Mapping[str, Any],
    ism: Mapping[str, Any],
    earnings: Mapping[str, Any],
    nfci_sp500: Mapping[str, Any],
    regional: Mapping[str, Any],
    philly: Mapping[str, Any],
    community_csv: str,
    global_liquidity_csv: str,
    liquidity_asset: Mapping[str, Any],
) -> list[dict[str, Any]]:
    panels = [
        _panel(
            "leading.global_rate_cuts",
            "leading",
            "全球央行降息比例与标普 500 同比",
            "降息比例向右平移 12 个月, 标普 500 同比保持原日期。",
            _SOURCE_URLS["global_rate_cuts"],
            [
                _series("cut_share_lead12", "全球央行降息比例(领先 12 个月)", _points(rate_cuts.get("series", []), "date", "cut_share", shift_months=12), unit="%"),
                _series("sp500_yoy", "标普 500 同比", _yoy_points(rate_cuts.get("series", []), "date", "sp500"), axis="right", unit="%"),
            ],
        ),
        _panel(
            "leading.ism",
            "leading",
            "ISM 制造业 PMI 与新订单减库存",
            "ISM PMI 与向右平移 3 个月的新订单减库存。",
            _SOURCE_URLS["ism_lead"],
            [
                _series("pmi", "ISM 制造业 PMI", _points(ism.get("pmi", []), "date", "value"), unit="点"),
                _series("orders_inventory", "新订单减库存(领先 3 个月)", _points(ism.get("spread", []), "date", "value"), axis="right", unit="点"),
            ],
        ),
        _panel(
            "leading.earnings",
            "leading",
            "标普 500 盈利同比与盈利领先指标",
            "盈利领先指标已按站点口径前移 12 个月。",
            _SOURCE_URLS["earnings_lead"],
            [
                _series("earnings_yoy", "标普 500 盈利同比", _points(earnings.get("series", []), "date", "earningsYoy"), unit="%"),
                _series("earnings_lead", "盈利领先指标", _points(earnings.get("series", []), "date", "earningsLead"), axis="right"),
            ],
        ),
        _panel(
            "leading.nfci_sp500",
            "leading",
            "NFCI 历史百分位与标普 500 同比",
            "站点数据中的 NFCI 历史百分位与标普 500 同比。",
            _SOURCE_URLS["nfci_sp500"],
            [
                _series("nfci_percentile", "NFCI 历史百分位", _points(nfci_sp500.get("series", []), "date", "nfciPercentile", transform=lambda value: value * 100), unit="%"),
                _series("sp500_yoy", "标普 500 同比", _points(nfci_sp500.get("series", []), "date", "sp500Yoy"), axis="right", unit="%"),
            ],
        ),
        _panel(
            "leading.regional_fed",
            "leading",
            "五大联储新订单减库存与标普 500 同比",
            "联储调查新订单减库存平均值向右平移 3 个月。",
            _SOURCE_URLS["regional_fed"],
            [
                _series("orders_inventory", "新订单减库存(领先 3 个月)", _points(regional.get("series", []), "date", "spread"), unit="点"),
                _series("sp500_yoy", "标普 500 同比", _points(regional.get("series", []), "date", "sp500Yoy"), axis="right", unit="%"),
            ],
        ),
        _panel(
            "leading.philly_fed",
            "leading",
            "费城联储未来预期与 ISM PMI",
            "费城联储未来一般活动指标向右平移 6 个月。",
            _SOURCE_URLS["philly_fed"],
            [
                _series("future_activity", "费城联储未来预期(领先 6 个月)", _points(philly.get("series", []), "date", "futureActivity"), unit="点"),
                _series("ism_pmi", "ISM 制造业 PMI", _points(philly.get("series", []), "date", "ismPmi"), unit="点"),
            ],
        ),
    ]

    community = _parse_csv(community_csv)
    panels.append(
        _panel(
            "leading.community",
            "leading",
            "社群领先指标 1 与标普 500 同比",
            "社群领先指标向右平移 11 个月。",
            _SOURCE_URLS["community"],
            [
                _series("indicator", "社群领先指标 1(领先 11 个月)", _points(community, "date", "indicator"), unit="点"),
                _series("sp500_yoy", "标普 500 同比", _points(community, "date", "spxYoy"), axis="right", unit="%"),
            ],
        )
    )

    liquidity = _parse_csv(global_liquidity_csv)
    panels.append(
        _panel(
            "leading.global_liquidity",
            "leading",
            "全球流动性领先指标与标普 500 同比",
            "站点原始 Pine 等权全球流动性领先指标。",
            _SOURCE_URLS["global_liquidity"],
            [
                _series("liquidity", "全球流动性领先指标", _points(liquidity, "date", "macro_wave_plot_lead12")),
                _series("sp500_yoy", "标普 500 同比", _points(liquidity, "date", "spx_yoy"), axis="right", unit="%"),
            ],
        )
    )

    for chart in liquidity_asset.get("charts", []):
        if not isinstance(chart, dict):
            continue
        chart_series = chart.get("series", [])
        key = str(chart.get("key", ""))
        if not key or not isinstance(chart_series, list):
            continue
        panels.append(
            _panel(
                f"leading.liquidity_asset.{key}",
                "leading",
                str(chart.get("title", key)),
                f"{chart.get('liquidityLabel', '全球流动性')}; {chart.get('assetLabel', '风险资产')}。",
                _SOURCE_URLS["liquidity_asset"],
                [
                    _series("liquidity", str(chart.get("liquidityLabel", "全球流动性")), _points(chart_series, "date", "liquidity")),
                    _series("asset", str(chart.get("assetLabel", "风险资产")), _points(chart_series, "date", "asset"), axis="right", unit="%"),
                ],
            )
        )
    return [panel for panel in panels if panel["series"]]


def build_snapshot(
    *,
    fetch_text: Callable[[str], str] = _fetch_text,
    fetch_json: Callable[[str], Any] = _fetch_json,
) -> dict[str, Any]:
    """Fetch hanshu sources once and build the reusable normalized snapshot."""
    macro = _parse_macro_panel_html(fetch_text(_MACRO_URL))
    financial = fetch_json(_SOURCE_URLS["financial_stress"])
    gsblbr = fetch_json(_SOURCE_URLS["gsblbr"])
    leading_payloads = {
        key: fetch_json(url)
        for key, url in _SOURCE_URLS.items()
        if key in {
            "global_rate_cuts",
            "ism_lead",
            "earnings_lead",
            "nfci_sp500",
            "regional_fed",
            "philly_fed",
            "liquidity_asset",
        }
    }
    panels = _build_macro_panels(macro, financial, gsblbr)
    panels.extend(
        _build_leading_panels(
            leading_payloads["global_rate_cuts"],
            leading_payloads["ism_lead"],
            leading_payloads["earnings_lead"],
            leading_payloads["nfci_sp500"],
            leading_payloads["regional_fed"],
            leading_payloads["philly_fed"],
            fetch_text(_SOURCE_URLS["community"]),
            fetch_text(_SOURCE_URLS["global_liquidity"]),
            leading_payloads["liquidity_asset"],
        )
    )
    dates = [str(panel["start"]) for panel in panels if panel["start"]] + [str(panel["end"]) for panel in panels if panel["end"]]
    return {
        "snapshot_version": _SNAPSHOT_VERSION,
        "source": "hanshu123.com public data assets",
        "updated_at": datetime.now(UTC).isoformat(),
        "start": min(dates) if dates else None,
        "end": max(dates) if dates else None,
        "groups": ["macro", "leading", "gsblbr"],
        "panels": panels,
        "sources": [
            {"key": key, "url": url, "publisher": "hanshu123.com"}
            for key, url in _SOURCE_URLS.items()
        ],
    }


def _filter_panel(panel: Mapping[str, Any], start: str | None, end: str | None) -> dict[str, Any]:
    filtered_series: list[dict[str, Any]] = []
    dates: list[str] = []
    for series in panel.get("series", []):
        points = [
            point
            for point in series.get("points", [])
            if (not start or point["date"] >= start) and (not end or point["date"] <= end)
        ]
        if points:
            filtered_series.append({**series, "points": points})
            dates.extend(str(point["date"]) for point in points)
    return {
        **panel,
        "start": min(dates) if dates else None,
        "end": max(dates) if dates else None,
        "series": filtered_series,
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
        if not isinstance(payload, dict) or not isinstance(payload.get("panels"), list):
            raise ValueError("invalid US market snapshot")
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


router = APIRouter(prefix="/api/us-market", tags=["us-market"])


@router.get("/overview")
def overview(
    request: Request,
    start: Annotated[date | None, Query()] = None,
    end: Annotated[date | None, Query()] = None,
    refresh: Annotated[bool, Query()] = False,
) -> dict[str, Any]:
    if start and end and start > end:
        raise HTTPException(status_code=400, detail="start must not be after end")
    try:
        path = _data_path(request)
        if refresh:
            with _build_lock:
                payload = build_snapshot()
                _write_payload(path, payload)
        else:
            payload = _load_or_build(path)
    except (OSError, ValueError, httpx.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning("US market snapshot unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="US market data unavailable") from exc

    filtered = [_filter_panel(panel, start.isoformat() if start else None, end.isoformat() if end else None) for panel in payload["panels"]]
    visible_dates = [
        str(panel_date)
        for panel in filtered
        for panel_date in (panel["start"], panel["end"])
        if panel_date
    ]
    return {
        **payload,
        "start": min(visible_dates) if visible_dates else None,
        "end": max(visible_dates) if visible_dates else None,
        "query": {"start": start.isoformat() if start else None, "end": end.isoformat() if end else None},
        "panels": [panel for panel in filtered if panel["series"]],
        "total_panels": sum(bool(panel["series"]) for panel in filtered),
    }


@router.get("/series/{panel_id}")
def series(
    request: Request,
    panel_id: str,
    start: Annotated[date | None, Query()] = None,
    end: Annotated[date | None, Query()] = None,
) -> dict[str, Any]:
    result = overview(request, start, end, False)
    for panel in result["panels"]:
        if panel["id"] == panel_id:
            return panel
    raise HTTPException(status_code=404, detail=f"US market panel not found: {panel_id}")


@router.post("/refresh")
def refresh(request: Request) -> dict[str, Any]:
    try:
        with _build_lock:
            payload = build_snapshot()
            _write_payload(_data_path(request), payload)
    except (OSError, ValueError, httpx.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning("US market refresh failed: %s", exc)
        raise HTTPException(status_code=503, detail="US market refresh failed") from exc
    return {
        "ok": True,
        "updated_at": payload["updated_at"],
        "start": payload["start"],
        "end": payload["end"],
        "panels": len(payload["panels"]),
    }


def setup(registrar: BackendExtensionRegistrar) -> None:
    registrar.include_router(router)
