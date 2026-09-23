from __future__ import annotations

from datetime import date
from types import SimpleNamespace

import polars as pl
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.analysis.trend.analyzer import analyze_trend
from app.analysis.trend.contracts import TrendAnalysisInput, TrendBar
from app.api import trend_analysis


def _bars(closes: list[float], highs: list[float] | None = None) -> list[dict]:
    highs = highs or [close for close in closes]
    return [
        {
            "date": date(2026, 1, index + 1),
            "open": close,
            "high": high,
            "low": close,
            "close": close,
            "volume": 1000.0,
            "amount": close * 1000,
        }
        for index, (close, high) in enumerate(zip(closes, highs, strict=True))
    ]


def _input(bars: list[dict], **kwargs) -> TrendAnalysisInput:
    return TrendAnalysisInput(
        symbol="600000.SH",
        market="cn",
        interval="1d",
        bars=bars,
        price_basis="adjusted",
        **kwargs,
    )


def test_trend_analysis_returns_degraded_bullish_result_without_optional_context():
    result = analyze_trend(_input(_bars([10, 10.5, 11, 12, 13])))

    assert result.status == "degraded"
    assert result.data_as_of == date(2026, 1, 5)
    assert result.signals[0].signal_type == "trend"
    assert result.signals[0].label == "bullish"
    assert "index_bars" in " ".join(result.limitations)
    assert result.algorithm_version == "trend-chanlun-mvp-0.2"
    assert result.overlays[0].overlay_type == "trend_line"


def test_trend_analysis_is_ok_when_optional_context_is_provided():
    result = analyze_trend(
        _input(
            _bars([10, 10.5, 11, 12, 13]),
            index_bars=[TrendBar.model_validate(bar) for bar in _bars([100, 101, 102, 103, 104])],
            fund_flow=[],
            market_breadth=[],
        )
    )

    assert result.status == "ok"
    assert result.limitations == []


def test_breakout_signal_compares_latest_close_with_prior_bars_only():
    result = analyze_trend(_input(_bars([10, 10.5, 10.2, 10.8, 12], highs=[10.2, 10.7, 10.4, 11, 12])))

    assert any(signal.signal_type == "breakout_up" for signal in result.signals)
    breakout = next(signal for signal in result.signals if signal.signal_type == "breakout_up")
    assert breakout.as_of == date(2026, 1, 5)
    assert breakout.window_end == date(2026, 1, 4)
    assert "close_above_prior_high" in breakout.reason_codes


def test_trend_analysis_reports_not_available_for_insufficient_bars():
    result = analyze_trend(_input(_bars([10, 10.5, 11, 12])))

    assert result.status == "not_available"
    assert result.signals == []
    assert result.overlays == []
    assert result.data_as_of == date(2026, 1, 4)


def test_input_rejects_non_chronological_or_invalid_ohlc():
    bars = _bars([10, 11, 12, 13, 14])
    bars[1]["date"] = bars[0]["date"]
    with pytest.raises(ValidationError):
        _input(bars)

    invalid = _bars([10, 11, 12, 13, 14])
    invalid[2]["low"] = 13
    with pytest.raises(ValidationError):
        _input(invalid)


def _request(repo) -> SimpleNamespace:
    app = FastAPI()
    app.state.repo = repo
    return SimpleNamespace(app=app)


class _Repo:
    def __init__(self, frame: pl.DataFrame):
        self.frame = frame

    def resolve_asset_type(self, symbol: str) -> str:
        assert symbol == "600000.SH"
        return "stock"

    def get_daily_asset(self, asset_type, symbol, start, end, columns, market):
        assert (asset_type, symbol, market) == ("stock", "600000.SH", "cn")
        return self.frame.filter((pl.col("date") >= start) & (pl.col("date") <= end)).select(columns)


def _frame() -> pl.DataFrame:
    return pl.DataFrame(_bars([10, 10.5, 11, 12, 13])).with_columns(
        pl.col("date").cast(pl.Date),
    )


def test_trend_route_reads_repository_and_returns_contract():
    response = trend_analysis.get_trend_analysis(
        _request(_Repo(_frame())),
        "600000.SH",
        market="cn",
        interval="1d",
        start=date(2026, 1, 1),
        end=date(2026, 1, 5),
        price_basis="adjusted",
    )

    assert response.status == "degraded"
    assert response.symbol == "600000.SH"
    assert response.provenance[0]["dataset"] == "daily"


def test_trend_route_returns_not_available_when_repository_is_empty():
    response = trend_analysis.get_trend_analysis(
        _request(_Repo(pl.DataFrame(schema={
            "date": pl.Date,
            "open": pl.Float64,
            "high": pl.Float64,
            "low": pl.Float64,
            "close": pl.Float64,
            "volume": pl.Float64,
            "amount": pl.Float64,
        }))),
        "600000.SH",
        market="cn",
        interval="1d",
        start=date(2026, 1, 1),
        end=date(2026, 1, 5),
        price_basis="adjusted",
    )

    assert response.status == "not_available"
    assert response.data_as_of is None
    assert response.signals == []


def test_trend_route_marks_unsupported_interval_unavailable_without_repository_read():
    class _NoReadRepo:
        def resolve_asset_type(self, symbol):
            raise AssertionError("unsupported interval should not read data")

    response = trend_analysis.get_trend_analysis(
        _request(_NoReadRepo()),
        "600000.SH",
        market="cn",
        interval="5m",
        start=date(2026, 1, 1),
        end=date(2026, 1, 5),
        price_basis="adjusted",
    )

    assert response.status == "not_available"
    assert "1d" in " ".join(response.limitations)


def test_trend_route_does_not_fallback_from_raw_to_adjusted():
    class _NoReadRepo:
        def resolve_asset_type(self, symbol):
            raise AssertionError("raw data is not available from this repository")

    response = trend_analysis.get_trend_analysis(
        _request(_NoReadRepo()),
        "600000.SH",
        market="cn",
        interval="1d",
        start=date(2026, 1, 1),
        end=date(2026, 1, 5),
        price_basis="raw",
    )

    assert response.status == "not_available"
    assert "raw" in " ".join(response.limitations)


def test_trend_route_returns_error_when_repository_read_fails():
    class _BrokenRepo:
        def resolve_asset_type(self, symbol):
            raise RuntimeError("storage unavailable")

    response = trend_analysis.get_trend_analysis(
        _request(_BrokenRepo()),
        "600000.SH",
        market="cn",
        interval="1d",
        start=date(2026, 1, 1),
        end=date(2026, 1, 5),
        price_basis="adjusted",
    )

    assert response.status == "error"
    assert "storage unavailable" not in " ".join(response.limitations)


def test_trend_route_is_registered_at_expected_path():
    app = FastAPI()
    app.include_router(trend_analysis.router)
    app.state.repo = _Repo(_frame())

    route_paths = {route.path for route in app.routes}
    assert "/api/analysis/trend/{symbol}" in route_paths
    response = TestClient(app).get(
        "/api/analysis/trend/600000.SH?start=2026-01-01&end=2026-01-05"
    )
    assert response.status_code == 200
    assert response.json()["status"] == "degraded"
