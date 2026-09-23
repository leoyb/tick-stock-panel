"""Small, deterministic Chanlun structure extractor for daily K lines.

This module deliberately implements the useful first boundary instead of
pretending to be a complete academic implementation: confirmed three-bar
fractals are cleaned into an alternating sequence, adjacent fractals form
strokes, three-stroke groups form segments and overlapping three-stroke
windows form centers.  Every observation carries both its event bar and the
bar on which it became confirmable, so the chart does not hide look-ahead.
"""
from __future__ import annotations

from collections.abc import Sequence
from itertools import pairwise

from app.analysis.trend.contracts import (
    ChanlunAnalysis,
    ChanlunCenter,
    ChanlunFractal,
    ChanlunSegment,
    ChanlunStroke,
    TrendBar,
    TrendSignal,
)

MIN_FRACTAL_GAP = 2
MAX_OBSERVATIONS = 12


def _raw_fractals(bars: Sequence[TrendBar]) -> list[ChanlunFractal]:
    result: list[ChanlunFractal] = []
    for index in range(1, len(bars) - 1):
        previous, current, following = bars[index - 1 : index + 2]
        is_top = (
            current.high >= previous.high
            and current.high >= following.high
            and (current.high > previous.high or current.high > following.high)
        )
        is_bottom = (
            current.low <= previous.low
            and current.low <= following.low
            and (current.low < previous.low or current.low < following.low)
        )
        if is_top:
            result.append(
                ChanlunFractal(
                    kind="top",
                    index=index,
                    date=current.date,
                    price=current.high,
                    confirmed_index=index + 1,
                    confirmed_date=following.date,
                )
            )
        elif is_bottom:
            result.append(
                ChanlunFractal(
                    kind="bottom",
                    index=index,
                    date=current.date,
                    price=current.low,
                    confirmed_index=index + 1,
                    confirmed_date=following.date,
                )
            )
    return result


def _alternating_fractals(candidates: Sequence[ChanlunFractal]) -> list[ChanlunFractal]:
    """Keep one extreme per direction and prevent adjacent duplicate pivots."""
    result: list[ChanlunFractal] = []
    for candidate in candidates:
        if not result:
            result.append(candidate)
            continue
        previous = result[-1]
        if candidate.kind == previous.kind:
            more_extreme = (
                candidate.price > previous.price
                if candidate.kind == "top"
                else candidate.price < previous.price
            )
            if more_extreme:
                result[-1] = candidate
            continue
        if candidate.index - previous.index >= MIN_FRACTAL_GAP:
            result.append(candidate)
    return result


def _strokes(bars: Sequence[TrendBar], fractals: Sequence[ChanlunFractal]) -> list[ChanlunStroke]:
    result: list[ChanlunStroke] = []
    for start, end in pairwise(fractals):
        if end.index - start.index < MIN_FRACTAL_GAP:
            continue
        direction = "up" if start.kind == "bottom" else "down"
        window = bars[start.index : end.index + 1]
        result.append(
            ChanlunStroke(
                start_index=start.index,
                end_index=end.index,
                start_date=start.date,
                end_date=end.date,
                direction=direction,
                start_price=start.price,
                end_price=end.price,
                high=max(bar.high for bar in window),
                low=min(bar.low for bar in window),
                start_fractal=start.kind,
                end_fractal=end.kind,
            )
        )
    return result


def _segments(strokes: Sequence[ChanlunStroke]) -> list[ChanlunSegment]:
    result: list[ChanlunSegment] = []
    # With alternating strokes, the first and third stroke describe the same
    # swing direction.  Non-overlapping groups keep the overlay readable.
    for index in range(0, len(strokes) - 2, 2):
        first, last = strokes[index], strokes[index + 2]
        if first.direction != last.direction:
            continue
        result.append(
            ChanlunSegment(
                start_index=first.start_index,
                end_index=last.end_index,
                start_date=first.start_date,
                end_date=last.end_date,
                direction=first.direction,
                start_price=first.start_price,
                end_price=last.end_price,
                high=max(stroke.high for stroke in strokes[index : index + 3]),
                low=min(stroke.low for stroke in strokes[index : index + 3]),
                stroke_start_index=index,
                stroke_end_index=index + 2,
            )
        )
    return result


def _centers(strokes: Sequence[ChanlunStroke]) -> list[ChanlunCenter]:
    result: list[ChanlunCenter] = []
    for index in range(len(strokes) - 2):
        window = strokes[index : index + 3]
        low = max(stroke.low for stroke in window)
        high = min(stroke.high for stroke in window)
        if low >= high:
            continue
        first, last = window[0], window[-1]
        result.append(
            ChanlunCenter(
                start_index=first.start_index,
                end_index=last.end_index,
                start_date=first.start_date,
                end_date=last.end_date,
                low=low,
                high=high,
                stroke_start_index=index,
                stroke_end_index=index + 2,
            )
        )
    return result


def _observations(
    bars: Sequence[TrendBar], strokes: Sequence[ChanlunStroke]
) -> list[TrendSignal]:
    result: list[TrendSignal] = []
    for stroke in strokes:
        if stroke.end_fractal == "bottom":
            signal_type = "chanlun_buy"
            label = "买点观察"
            reason_codes = ["confirmed_bottom_fractal", "stroke_down_complete"]
        else:
            signal_type = "chanlun_sell"
            label = "卖点观察"
            reason_codes = ["confirmed_top_fractal", "stroke_up_complete"]
        confirmation_index = min(stroke.end_index + 1, len(bars) - 1)
        result.append(
            TrendSignal(
                signal_type=signal_type,
                label=label,
                confidence=0.58,
                reason_codes=reason_codes,
                as_of=bars[confirmation_index].date,
                event_date=bars[stroke.end_index].date,
                window_start=bars[stroke.start_index].date,
                window_end=bars[stroke.end_index].date,
            )
        )
    return result[-MAX_OBSERVATIONS:]


def analyze_chanlun(bars: Sequence[TrendBar]) -> ChanlunAnalysis:
    """Extract confirmed Chanlun structures from chronological OHLC bars."""
    fractals = _alternating_fractals(_raw_fractals(bars))
    strokes = _strokes(bars, fractals)
    return ChanlunAnalysis(
        fractals=fractals,
        strokes=strokes,
        segments=_segments(strokes),
        centers=_centers(strokes),
        observations=_observations(bars, strokes),
    )
