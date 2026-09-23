from __future__ import annotations

from datetime import date, timedelta

from app.analysis.trend.chanlun import analyze_chanlun
from app.analysis.trend.contracts import TrendBar


def _bars(closes: list[float]) -> list[TrendBar]:
    start = date(2026, 1, 1)
    return [
        TrendBar(
            date=start + timedelta(days=index),
            open=close,
            high=close + 0.5,
            low=close - 0.5,
            close=close,
        )
        for index, close in enumerate(closes)
    ]


WAVE_BARS = _bars([10, 12, 15, 13, 11, 14, 17, 15, 12, 14, 18, 16, 13, 15, 19, 17, 14])


def test_chanlun_fractals_are_confirmed_and_alternating():
    result = analyze_chanlun(WAVE_BARS)

    assert [fractal.kind for fractal in result.fractals] == [
        "top",
        "bottom",
        "top",
        "bottom",
        "top",
        "bottom",
        "top",
    ]
    assert all(fractal.confirmed_index == fractal.index + 1 for fractal in result.fractals)
    assert all(fractal.confirmed_date > fractal.date for fractal in result.fractals)


def test_chanlun_strokes_pair_confirmed_opposite_fractals():
    result = analyze_chanlun(WAVE_BARS)

    assert len(result.strokes) == len(result.fractals) - 1
    assert [stroke.direction for stroke in result.strokes[:4]] == ["down", "up", "down", "up"]
    assert all(stroke.end_index - stroke.start_index >= 2 for stroke in result.strokes)
    assert all(stroke.high >= stroke.low for stroke in result.strokes)


def test_chanlun_segments_and_centers_have_chart_boundaries():
    result = analyze_chanlun(WAVE_BARS)

    assert result.segments
    assert result.centers
    for segment in result.segments:
        assert segment.start_index < segment.end_index
        assert segment.start_date < segment.end_date
    for center in result.centers:
        assert center.start_index < center.end_index
        assert center.low < center.high


def test_chanlun_observations_separate_event_from_confirmation_date():
    result = analyze_chanlun(WAVE_BARS)

    assert result.observations
    assert {signal.signal_type for signal in result.observations} == {"chanlun_buy", "chanlun_sell"}
    for signal in result.observations:
        assert signal.event_date is not None
        assert signal.event_date < signal.as_of
        assert signal.reason_codes


def test_chanlun_returns_empty_structures_when_bars_cannot_form_a_fractal():
    result = analyze_chanlun(_bars([10, 11, 12, 13]))

    assert result.fractals == []
    assert result.strokes == []
    assert result.segments == []
    assert result.centers == []
    assert result.observations == []
