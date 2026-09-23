from app.custom.us_market import _filter_panel, _parse_macro_panel_html


def test_parse_macro_panel_html_reads_embedded_hanshu_dataset():
    body = """
    <script type="application/json" id="sp500-five-panel-data">
    {"index":[{"d":"2020-01-31","p":100,"y":5.0}],"cape":[{"d":"2020-01-31","v":20}]}
    </script>
    """

    assert _parse_macro_panel_html(body) == {
        "index": [{"d": "2020-01-31", "p": 100, "y": 5.0}],
        "cape": [{"d": "2020-01-31", "v": 20}],
    }


def test_filter_panel_applies_inclusive_date_bounds_to_every_series():
    panel = {
        "id": "macro.test",
        "group": "macro",
        "title": "测试",
        "series": [
            {
                "key": "value",
                "label": "值",
                "axis": "left",
                "unit": "",
                "points": [
                    {"date": "2020-01-01", "value": 1},
                    {"date": "2020-02-01", "value": 2},
                    {"date": "2020-03-01", "value": 3},
                ],
            }
        ],
    }

    filtered = _filter_panel(panel, "2020-02-01", "2020-02-01")

    assert filtered["start"] == "2020-02-01"
    assert filtered["end"] == "2020-02-01"
    assert filtered["series"][0]["points"] == [{"date": "2020-02-01", "value": 2}]
