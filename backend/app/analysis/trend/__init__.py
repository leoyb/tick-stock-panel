"""Small, deterministic trend-analysis primitives."""

from app.analysis.trend.analyzer import ALGORITHM_VERSION, analyze_trend
from app.analysis.trend.contracts import (
    TrendAnalysisInput,
    TrendAnalysisResult,
    TrendBar,
    TrendSignal,
)

__all__ = [
    "ALGORITHM_VERSION",
    "TrendAnalysisInput",
    "TrendAnalysisResult",
    "TrendBar",
    "TrendSignal",
    "analyze_trend",
]
