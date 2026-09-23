from app.custom.gsblbr import (
    _parse_official_series,
    build_private_balance_series,
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


def test_private_balance_is_four_quarter_average_published_two_months_later():
    dates = ["2020-01-01", "2020-04-01", "2020-07-01", "2020-10-01", "2021-01-01"]
    result = build_private_balance_series(
        saving=dict(zip(dates, [110.0, 120.0, 130.0, 140.0, 150.0], strict=True)),
        investment=dict(zip(dates, [100.0, 100.0, 100.0, 100.0, 100.0], strict=True)),
        gdp=dict(zip(dates, [1000.0] * len(dates), strict=True)),
    )

    assert result == {
        "2020-12-01": 2.5,
        "2021-03-01": 3.5,
    }


def test_parse_official_series_keeps_only_public_original_values():
    assert _parse_official_series(
        {
            "series": [
                {"d": "2025-06-08", "o": 68.887499, "v": 69.18520112},
                {"d": "2025-09-16"},
            ]
        }
    ) == [{"date": "2025-06-08", "value": 68.887499}]
