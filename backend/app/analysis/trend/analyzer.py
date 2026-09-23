"""Deterministic daily trend and Chanlun analysis.

The module owns no I/O.  It combines the original trend slice with the native
Chanlun structure extractor so both outputs use the same normalized bars.
"""
from __future__ import annotations

from statistics import fmean

from app.analysis.trend.chanlun import analyze_chanlun
from app.analysis.trend.contracts import (
    ChanlunAnalysis,
    TrendAnalysisInput,
    TrendAnalysisResult,
    TrendOverlay,
    TrendPoint,
    TrendSignal,
    TrendStatus,
)

ALGORITHM_VERSION = "trend-chanlun-mvp-0.2"
MIN_BARS = 5


def _result(
    data: TrendAnalysisInput,
    *,
    status: TrendStatus,
    summary: str,
    limitations: list[str] | None = None,
    signals: list[TrendSignal] | None = None,
    overlays: list[TrendOverlay] | None = None,
    structures: list[dict[str, object]] | None = None,
    chanlun: ChanlunAnalysis | None = None,
) -> TrendAnalysisResult:
    return TrendAnalysisResult(
        status=status,
        algorithm_version=ALGORITHM_VERSION,
        data_as_of=data.bars[-1].date if data.bars else None,
        symbol=data.symbol,
        market=data.market,
        interval=data.interval,
        price_basis=data.price_basis,
        signals=signals or [],
        overlays=overlays or [],
        structures=structures or [],
        chanlun=chanlun or ChanlunAnalysis(),
        summary=summary,
        limitations=limitations or [],
        provenance=list(data.source_provenance),
    )


def _context_limitations(data: TrendAnalysisInput) -> list[str]:
    missing = [
        name
        for name, value in (
            ("index_bars", data.index_bars),
            ("fund_flow", data.fund_flow),
            ("market_breadth", data.market_breadth),
        )
        if value is None
    ]
    return [f"缺少可选上下文: {', '.join(missing)}"] if missing else []


def _trend_signal(data: TrendAnalysisInput, window: int) -> tuple[TrendSignal, str, float]:
    baseline = fmean(bar.close for bar in data.bars[:window])
    recent = fmean(bar.close for bar in data.bars[-window:])
    change = (recent - baseline) / baseline if baseline else 0.0

    if change > 0.01:
        label = "bullish"
        reason = "recent_close_above_baseline"
    elif change < -0.01:
        label = "bearish"
        reason = "recent_close_below_baseline"
    else:
        label = "sideways"
        reason = "recent_close_near_baseline"

    confidence = round(min(0.99, 0.5 + abs(change) * 5), 2)
    return (
        TrendSignal(
            signal_type="trend",
            label=label,
            confidence=confidence,
            reason_codes=[reason],
            as_of=data.bars[-1].date,
            window_start=data.bars[0].date,
            window_end=data.bars[-1].date,
        ),
        label,
        change,
    )


def _breakout_signal(data: TrendAnalysisInput) -> TrendSignal | None:
    latest = data.bars[-1]
    prior = data.bars[:-1]
    prior_high = max(bar.high for bar in prior)
    prior_low = min(bar.low for bar in prior)
    if latest.close > prior_high:
        signal_type = "breakout_up"
        label = "breakout_up"
        reason = "close_above_prior_high"
    elif latest.close < prior_low:
        signal_type = "breakdown"
        label = "breakdown"
        reason = "close_below_prior_low"
    else:
        return None
    return TrendSignal(
        signal_type=signal_type,
        label=label,
        confidence=0.9,
        reason_codes=[reason],
        as_of=latest.date,
        window_start=data.bars[0].date,
        window_end=prior[-1].date,
    )


def _trend_overlay(data: TrendAnalysisInput, window: int) -> TrendOverlay:
    recent = data.bars[-window:]
    first, last = recent[0].close, recent[-1].close
    denominator = max(len(recent) - 1, 1)
    points = [
        TrendPoint(
            date=bar.date,
            value=round(first + (last - first) * index / denominator, 6),
        )
        for index, bar in enumerate(recent)
    ]
    return TrendOverlay(overlay_type="trend_line", label="近期趋势线", points=points)


def _chanlun_overlays(data: TrendAnalysisInput, chanlun: ChanlunAnalysis) -> list[TrendOverlay]:
    def path(start_index: int, end_index: int, start_price: float, end_price: float) -> list[TrendPoint]:
        denominator = max(end_index - start_index, 1)
        return [
            TrendPoint(
                date=data.bars[index].date,
                value=round(start_price + (end_price - start_price) * (index - start_index) / denominator, 6),
            )
            for index in range(start_index, end_index + 1)
        ]

    overlays: list[TrendOverlay] = []
    for stroke in chanlun.strokes:
        overlays.append(
            TrendOverlay(
                overlay_type="chanlun_stroke",
                label="笔",
                points=path(stroke.start_index, stroke.end_index, stroke.start_price, stroke.end_price),
            )
        )
    for segment in chanlun.segments:
        overlays.append(
            TrendOverlay(
                overlay_type="chanlun_segment",
                label="线段",
                points=path(segment.start_index, segment.end_index, segment.start_price, segment.end_price),
            )
        )
    return overlays


def _chanlun_structures(chanlun: ChanlunAnalysis) -> list[dict[str, object]]:
    structures: list[dict[str, object]] = []
    for kind, items in (
        ("chanlun_fractal", chanlun.fractals),
        ("chanlun_stroke", chanlun.strokes),
        ("chanlun_segment", chanlun.segments),
        ("chanlun_center", chanlun.centers),
    ):
        structures.extend({"type": kind, **item.model_dump(mode="json")} for item in items)
    return structures


def analyze_trend(data: TrendAnalysisInput) -> TrendAnalysisResult:
    """Analyze one chronological daily-bar snapshot without external I/O."""
    if data.interval != "1d":
        return _result(data, status="not_available", summary="当前 MVP 仅支持 1d 日线", limitations=["interval must be 1d"])
    if len(data.bars) < MIN_BARS:
        return _result(
            data,
            status="not_available",
            summary="日线数据不足, 暂不计算趋势",
            limitations=[f"至少需要 {MIN_BARS} 根 K 线"],
        )

    window = min(5, len(data.bars) // 2)
    trend, label, change = _trend_signal(data, window)
    chanlun = analyze_chanlun(data.bars)
    signals = [trend]
    breakout = _breakout_signal(data)
    if breakout:
        signals.append(breakout)
    signals.extend(chanlun.observations)

    limitations = _context_limitations(data)
    return _result(
        data,
        status="degraded" if limitations else "ok",
        summary=f"最近 {window} 个交易日趋势{label}, 收盘均值变化 {change:.2%}。",
        limitations=limitations,
        signals=signals,
        overlays=[_trend_overlay(data, window), *_chanlun_overlays(data, chanlun)],
        structures=[
            {
                "type": "trend_phase",
                "label": label,
                "window_start": data.bars[0].date,
                "window_end": data.bars[-1].date,
                "change_pct": round(change * 100, 4),
            },
            *_chanlun_structures(chanlun),
        ],
        chanlun=chanlun,
    )
