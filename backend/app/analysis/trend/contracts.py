"""Contracts for the first deterministic daily trend-analysis slice."""
from __future__ import annotations

import math
from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

TrendStatus = Literal["ok", "degraded", "not_available", "error"]
PriceBasis = Literal["adjusted", "raw"]


class TrendBar(BaseModel):
    """One normalized OHLCV bar used by the analysis layer."""

    date: date
    open: float
    high: float
    low: float
    close: float
    volume: float | None = None
    amount: float | None = None

    @field_validator("open", "high", "low", "close", "volume", "amount")
    @classmethod
    def finite_number(cls, value: float | None) -> float | None:
        if value is not None and not math.isfinite(value):
            raise ValueError("OHLCV values must be finite")
        return value

    @model_validator(mode="after")
    def validate_ohlc(self) -> TrendBar:
        if self.high < max(self.open, self.close):
            raise ValueError("high must be at least open and close")
        if self.low > min(self.open, self.close):
            raise ValueError("low must be at most open and close")
        return self


class TrendAnalysisInput(BaseModel):
    """Input boundary between TickFlow data and deterministic analysis."""

    symbol: str = Field(min_length=1)
    market: str = Field(min_length=1)
    interval: str = "1d"
    bars: list[TrendBar] = Field(default_factory=list)
    price_basis: PriceBasis = "adjusted"
    index_bars: list[TrendBar] | None = None
    fund_flow: list[dict[str, Any]] | None = None
    market_breadth: list[dict[str, Any]] | None = None
    source_provenance: list[dict[str, Any]] = Field(default_factory=list)

    @field_validator("symbol", "market")
    @classmethod
    def non_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("value must not be blank")
        return value

    @model_validator(mode="after")
    def validate_chronology(self) -> TrendAnalysisInput:
        if any(left.date >= right.date for left, right in zip(self.bars, self.bars[1:], strict=False)):
            raise ValueError("bars must be strictly chronological")
        return self


class TrendPoint(BaseModel):
    date: date
    value: float


class TrendSignal(BaseModel):
    """A user-visible signal with enough context to explain its trigger."""

    signal_type: Literal[
        "trend",
        "breakout_up",
        "breakdown",
        "chanlun_buy",
        "chanlun_sell",
    ]
    label: str
    confidence: float = Field(ge=0, le=1)
    reason_codes: list[str]
    # The signal is only actionable after this date, while event_date points
    # at the historical bar that produced the marker on the chart.
    as_of: date
    event_date: date | None = None
    window_start: date
    window_end: date


class TrendOverlay(BaseModel):
    overlay_type: Literal["trend_line", "chanlun_stroke", "chanlun_segment"]
    label: str
    points: list[TrendPoint]


class ChanlunFractal(BaseModel):
    kind: Literal["top", "bottom"]
    index: int = Field(ge=0)
    date: date
    price: float
    confirmed_index: int = Field(ge=0)
    confirmed_date: date


class ChanlunStroke(BaseModel):
    start_index: int = Field(ge=0)
    end_index: int = Field(ge=0)
    start_date: date
    end_date: date
    direction: Literal["up", "down"]
    start_price: float
    end_price: float
    high: float
    low: float
    start_fractal: Literal["top", "bottom"]
    end_fractal: Literal["top", "bottom"]


class ChanlunSegment(BaseModel):
    start_index: int = Field(ge=0)
    end_index: int = Field(ge=0)
    start_date: date
    end_date: date
    direction: Literal["up", "down"]
    start_price: float
    end_price: float
    high: float
    low: float
    stroke_start_index: int = Field(ge=0)
    stroke_end_index: int = Field(ge=0)


class ChanlunCenter(BaseModel):
    start_index: int = Field(ge=0)
    end_index: int = Field(ge=0)
    start_date: date
    end_date: date
    low: float
    high: float
    stroke_start_index: int = Field(ge=0)
    stroke_end_index: int = Field(ge=0)


class ChanlunAnalysis(BaseModel):
    """Deterministic, chart-ready Chanlun structure for the current snapshot."""

    fractals: list[ChanlunFractal] = Field(default_factory=list)
    strokes: list[ChanlunStroke] = Field(default_factory=list)
    segments: list[ChanlunSegment] = Field(default_factory=list)
    centers: list[ChanlunCenter] = Field(default_factory=list)
    observations: list[TrendSignal] = Field(default_factory=list)


class TrendAnalysisResult(BaseModel):
    """Stable result envelope for the trend API and later chart consumers."""

    status: TrendStatus
    algorithm_version: str
    data_as_of: date | None
    symbol: str
    market: str
    interval: str
    price_basis: PriceBasis
    signals: list[TrendSignal] = Field(default_factory=list)
    overlays: list[TrendOverlay] = Field(default_factory=list)
    structures: list[dict[str, Any]] = Field(default_factory=list)
    chanlun: ChanlunAnalysis = Field(default_factory=ChanlunAnalysis)
    summary: str
    limitations: list[str] = Field(default_factory=list)
    provenance: list[dict[str, Any]] = Field(default_factory=list)
