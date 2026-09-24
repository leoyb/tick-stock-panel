import polars as pl
import pytest

from app.custom.gsblbr import (
    _parse_official_series,
    _parse_shiller_cape,
    _shiller_workbook_url,
    build_private_balance_series,
    build_snapshot,
    compute_gsblbr_series,
    percentile_rank,
)


def test_percentile_rank_uses_midrank_and_can_invert_risk_direction():
    values = [10.0, 20.0, 20.0, 40.0]

    assert percentile_rank(values, 20.0) == 50.0
    assert percentile_rank(values, 20.0, inverse=True) == 50.0
    assert percentile_rank(values, 10.0, inverse=True) == 100.0


def test_compute_gsblbr_series_equal_weights_six_risk_percentiles():
    dates = ["2020-01-01", "2020-02-01", "2020-03-01"]
    series = compute_gsblbr_series(
        cape=dict(zip(dates, [10.0, 20.0, 30.0], strict=True)),
        yield_curve=dict(zip(dates, [3.0, 2.0, 1.0], strict=True)),
        manufacturing=dict(zip(dates, [40.0, 50.0, 60.0], strict=True)),
        private_balance=dict(zip(dates, [30.0, 20.0, 10.0], strict=True)),
        core_inflation=dict(zip(dates, [1.0, 2.0, 3.0], strict=True)),
        unemployment=dict(zip(dates, [8.0, 6.0, 4.0], strict=True)),
    )

    assert [row["date"] for row in series] == dates
    assert [row["score"] for row in series] == [0.0, 50.0, 100.0]
    assert series[-1]["private_balance_score"] == 100.0
    assert series[-1]["unemployment_score"] == 100.0


def test_private_balance_is_four_quarter_average_available_after_second_estimate():
    dates = ["2020-01-01", "2020-04-01", "2020-07-01", "2020-10-01", "2021-01-01"]
    result = build_private_balance_series(
        saving=dict(zip(dates, [110.0, 120.0, 130.0, 140.0, 150.0], strict=True)),
        investment=dict(zip(dates, [100.0, 100.0, 100.0, 100.0, 100.0], strict=True)),
        gdp=dict(zip(dates, [1000.0] * len(dates), strict=True)),
    )

    assert result == {
        "2021-02-01": 2.5,
        "2021-05-01": 3.5,
    }


def test_shiller_workbook_url_selects_official_download():
    html = '<a href="/other.xls">old</a><a href="https://example.com/ie_data.xls?ver=42">Download</a>'
    assert _shiller_workbook_url(html) == "https://example.com/ie_data.xls?ver=42"
    with pytest.raises(ValueError, match="link unavailable"):
        _shiller_workbook_url('<a href="/other.xls">old</a>')


def test_parse_shiller_workbook_keeps_numeric_cape_and_months(monkeypatch):
    monkeypatch.setattr(
        "app.custom.gsblbr.pl.read_excel",
        lambda *_args, **_kwargs: pl.DataFrame(
            {"Date": [2026.01, 2026.08, None], "CAPE": ["39.6", "41.119844", "note"]}
        ),
    )
    assert _parse_shiller_cape(b"workbook") == {
        "2026-01-01": 39.6,
        "2026-08-01": 41.119844,
    }


def test_invalid_shiller_workbook_fails_closed():
    with pytest.raises(ValueError, match="invalid Shiller workbook"):
        _parse_shiller_cape(b"not an excel workbook")


def test_snapshot_uses_public_inputs_and_carries_published_quarterly_balance(monkeypatch):
    monkeypatch.setattr(
        "app.custom.gsblbr._parse_shiller_cape",
        lambda _workbook: {"2026-08-01": 41.12, "2026-09-01": 41.2},
    )
    fred = {
        "GS10": {"2026-08-01": 4.68, "2026-09-01": 4.7},
        "TB3MS": {"2026-08-01": 3.72, "2026-09-01": 3.7},
        "IPMAN": {"2026-08-01": 99.1, "2026-09-01": 99.2},
        "CPILFESL": {
            "2025-08-01": 330.0,
            "2025-09-01": 331.0,
            "2026-08-01": 337.0,
            "2026-09-01": 338.0,
        },
        "UNRATE": {"2026-08-01": 4.1, "2026-09-01": 4.2},
        "GPSAVE": dict(zip(
            ["2025-07-01", "2025-10-01", "2026-01-01", "2026-04-01"],
            [110.0, 120.0, 130.0, 140.0], strict=True,
        )),
        "GPDI": dict.fromkeys(
            ["2025-07-01", "2025-10-01", "2026-01-01", "2026-04-01"], 100.0
        ),
        "GDP": dict.fromkeys(
            ["2025-07-01", "2025-10-01", "2026-01-01", "2026-04-01"], 1000.0
        ),
    }

    def fetch_text(url: str) -> str:
        if url == "https://shillerdata.com/":
            return '<a href="https://example.com/ie_data.xls">Download</a>'
        series_id = url.split("id=", 1)[1]
        return "observation_date," + series_id + "\n" + "".join(
            f"{day},{value}\n" for day, value in fred[series_id].items()
        )

    snapshot = build_snapshot(
        fetch_text=fetch_text,
        fetch_json=lambda _url: {"series": [
            {"d": "2025-08-30", "o": 68.0}, {"d": "2026-08-30"},
        ]},
        fetch_bytes=lambda _url: b"workbook",
    )

    assert snapshot["end"] == "2026-09-01"
    assert snapshot["latest"]["private_balance"] == 2.5
    assert snapshot["official_series"] == [{"date": "2025-08-30", "value": 68.0}]
    assert snapshot["status"] == "approximate"


def test_parse_official_series_keeps_only_public_original_values():
    assert _parse_official_series(
        {
            "series": [
                {"d": "2025-06-08", "o": 68.887499, "v": 69.18520112},
                {"d": "2025-09-16"},
            ]
        }
    ) == [{"date": "2025-06-08", "value": 68.887499}]
