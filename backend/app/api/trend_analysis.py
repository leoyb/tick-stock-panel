"""Deterministic trend-analysis API backed by the normalized K-line repository."""
from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Literal

import polars as pl
from fastapi import APIRouter, HTTPException, Request

from app.analysis.trend import (
    ALGORITHM_VERSION,
    TrendAnalysisInput,
    TrendAnalysisResult,
    TrendBar,
    analyze_trend,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["trend-analysis"])
_DAILY_COLUMNS = ["date", "open", "high", "low", "close", "volume", "amount"]


def _unavailable(
    symbol: str,
    market: str,
    interval: str,
    price_basis: Literal["adjusted", "raw"],
    summary: str,
    limitation: str,
) -> TrendAnalysisResult:
    return TrendAnalysisResult(
        status="not_available",
        algorithm_version=ALGORITHM_VERSION,
        data_as_of=None,
        symbol=symbol,
        market=market,
        interval=interval,
        price_basis=price_basis,
        summary=summary,
        limitations=[limitation],
    )


def _frame_bars(frame: pl.DataFrame) -> list[TrendBar]:
    return [TrendBar.model_validate(row) for row in frame.select(_DAILY_COLUMNS).to_dicts()]


@router.get("/trend/{symbol}", response_model=TrendAnalysisResult)
def get_trend_analysis(
    request: Request,
    symbol: str,
    market: Literal["cn", "hk", "us"] = "cn",
    interval: str = "1d",
    start: date | None = None,
    end: date | None = None,
    price_basis: Literal["adjusted", "raw"] = "adjusted",
) -> TrendAnalysisResult:
    """Return a deterministic, explainable trend snapshot for one symbol."""
    symbol = symbol.strip()
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol 不能为空")
    if interval != "1d":
        return _unavailable(
            symbol, market, interval, price_basis, "当前 MVP 仅支持 1d 日线", "interval must be 1d"
        )
    if price_basis == "raw":
        return _unavailable(
            symbol,
            market,
            interval,
            price_basis,
            "当前仓库尚未暴露原始价字段",
            "raw price basis is not available from the repository",
        )

    end_date = end or date.today()
    start_date = start or end_date - timedelta(days=365)
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start 不能晚于 end")

    repo = request.app.state.repo
    try:
        frame = repo.get_daily_asset(
            repo.resolve_asset_type(symbol),
            symbol,
            start_date,
            end_date,
            columns=_DAILY_COLUMNS,
            market=market,
        )
    except Exception:
        logger.exception("trend analysis daily data read failed for %s", symbol)
        return _unavailable(
            symbol, market, interval, price_basis, "日线数据读取失败", "daily data read failed"
        ).model_copy(update={"status": "error"})

    if frame.is_empty():
        return _unavailable(symbol, market, interval, price_basis, "无日线数据", "daily data is empty")
    if any(column not in frame.columns for column in _DAILY_COLUMNS):
        return _unavailable(
            symbol,
            market,
            interval,
            price_basis,
            "日线数据字段不完整",
            "daily data schema is incomplete",
        ).model_copy(update={"status": "error"})

    try:
        data = TrendAnalysisInput(
            symbol=symbol,
            market=market,
            interval=interval,
            bars=_frame_bars(frame),
            price_basis=price_basis,
            source_provenance=[
                {
                    "source_id": "tickflow.repository",
                    "dataset": "daily",
                    "as_of": str(frame["date"].max()),
                    "price_basis": price_basis,
                }
            ],
        )
    except (TypeError, ValueError) as exc:
        logger.warning("trend analysis daily data validation failed for %s: %s", symbol, exc)
        return _unavailable(
            symbol, market, interval, price_basis, "日线数据无法用于分析", "daily data validation failed"
        ).model_copy(update={"status": "error"})
    return analyze_trend(data)
