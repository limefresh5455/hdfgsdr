import os
import tempfile
import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from analytics import (
    align_actuals_and_forecasts,
    compute_accuracy_summary,
    compute_diurnal_breakdown
)
from database import (
    init_db,
    insert_actuals,
    insert_forecasts,
    get_day_ahead_forecasts_series,
    get_actuals_series
)
from app import app


def test_align_actuals_and_forecasts():
    actuals = [
        {"start_time": "2026-01-01T00:00:00Z", "settlement_date": "2026-01-01", "settlement_period": 1, "generation_mw": 1000.0},
        {"start_time": "2026-01-01T00:30:00Z", "settlement_date": "2026-01-01", "settlement_period": 2, "generation_mw": 1200.0},
    ]
    forecasts = [
        {"start_time": "2026-01-01T00:00:00Z", "generation_mw": 1100.0, "publish_time": "2025-12-31T09:20:00Z"},
    ]
    
    # 00:00 matches directly; 00:30 falls back to the hourly 00:00 forecast
    aligned = align_actuals_and_forecasts(actuals, forecasts)
    assert len(aligned) == 2
    
    # First: Actual 1000, Forecast 1100 => Error +100 (Over-forecast)
    assert aligned[0]["actual_mw"] == 1000.0
    assert aligned[0]["forecast_mw"] == 1100.0
    assert aligned[0]["error_mw"] == 100.0
    
    # Second: Actual 1200, Forecast 1100 => Error -100 (Under-forecast)
    assert aligned[1]["actual_mw"] == 1200.0
    assert aligned[1]["forecast_mw"] == 1100.0
    assert aligned[1]["error_mw"] == -100.0


def test_compute_accuracy_summary_math():
    aligned = [
        {"actual_mw": 100.0, "forecast_mw": 120.0, "error_mw": 20.0, "abs_error_mw": 20.0},
        {"actual_mw": 200.0, "forecast_mw": 180.0, "error_mw": -20.0, "abs_error_mw": 20.0},
        {"actual_mw": 300.0, "forecast_mw": 330.0, "error_mw": 30.0, "abs_error_mw": 30.0},
    ]
    kpis = compute_accuracy_summary(aligned)
    assert kpis["data_points"] == 3
    assert kpis["mae_mw"] == 23.33
    assert kpis["bias_mw"] == 10.0
    assert kpis["wape_percent"] == 11.67
    assert kpis["rmse_mw"] == 23.80
    assert kpis["min_error_mw"] == -20.0
    assert kpis["max_error_mw"] == 30.0


def test_safety_margin_positive_for_undergeneration():
    """
    Verifies that when wind comes in lower than forecast (under-generation, positive errors),
    the safety margin is positive and sized to the 90th percentile of error (p90), quantifying
    historical wind shortfall risk.
    """
    aligned = [
        {"actual_mw": 500.0, "forecast_mw": 800.0, "error_mw": 300.0, "abs_error_mw": 300.0},
        {"actual_mw": 600.0, "forecast_mw": 950.0, "error_mw": 350.0, "abs_error_mw": 350.0},
        {"actual_mw": 700.0, "forecast_mw": 1200.0, "error_mw": 500.0, "abs_error_mw": 500.0},
    ]
    kpis = compute_accuracy_summary(aligned)
    assert kpis["p90_error_mw"] > 0
    assert kpis["p90_safety_margin_mw"] == kpis["p90_error_mw"]
    assert kpis["p90_safety_margin_mw"] > 350.0


def test_diurnal_breakdown():
    aligned = [
        {
            "start_time": "2026-01-02T00:00:00Z",
            "settlement_period": 1,
            "actual_mw": 1000.0,
            "forecast_mw": 1100.0,
            "error_mw": 100.0,
            "abs_error_mw": 100.0
        },
        {
            "start_time": "2026-01-03T00:00:00Z",
            "settlement_period": 1,
            "actual_mw": 2000.0,
            "forecast_mw": 2050.0,
            "error_mw": 50.0,
            "abs_error_mw": 50.0
        }
    ]
    diurnal = compute_diurnal_breakdown(aligned)
    assert len(diurnal) == 48
    sp1 = diurnal[0]
    assert sp1["settlement_period"] == 1
    assert sp1["count"] == 2
    assert sp1["mae_mw"] == 75.0
    assert sp1["bias_mw"] == 75.0


def test_vintage_cutoff_prevents_lookahead_leakage():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tf:
        test_db = tf.name
        
    try:
        init_db(test_db)
        target_start = "2026-01-15T12:00:00Z"
        
        # Published runs on D-1 (2026-01-14):
        # 1. 07:30 UTC -> 4500 MW (Before 09:20 cutoff)
        # 2. 09:30 UTC -> 8500 MW (After 09:20 cutoff)
        forecast_records = [
            {"publish_time": "2026-01-14T07:30:00Z", "start_time": target_start, "generation_mw": 4500.0},
            {"publish_time": "2026-01-14T09:30:00Z", "start_time": target_start, "generation_mw": 8500.0},
        ]
        insert_forecasts(forecast_records, db_path=test_db)
        
        # With default EPEX SPOT gate closure cutoff (09:20:00 UTC)
        res_cutoff_default = get_day_ahead_forecasts_series(
            "2026-01-15", "2026-01-15", cutoff_time="09:20:00", db_path=test_db
        )
        assert len(res_cutoff_default) == 1
        # Must pick the 07:30 run (4500 MW), strictly ignoring 09:30
        assert res_cutoff_default[0]["generation_mw"] == 4500.0
        assert res_cutoff_default[0]["publish_time"] == "2026-01-14T07:30:00Z"
        
        # With later cutoff (11:00:00 UTC)
        res_cutoff_later = get_day_ahead_forecasts_series(
            "2026-01-15", "2026-01-15", cutoff_time="11:00:00", db_path=test_db
        )
        assert len(res_cutoff_later) == 1
        # Now 09:30 is eligible and picked
        assert res_cutoff_later[0]["generation_mw"] == 8500.0
        assert res_cutoff_later[0]["publish_time"] == "2026-01-14T09:30:00Z"
    finally:
        if os.path.exists(test_db):
            os.remove(test_db)


def test_input_validation_returns_422():
    client = TestClient(app)
    # Invalid date format
    resp_bad_date = client.get("/api/forecasts?date=invalid-date")
    assert resp_bad_date.status_code == 422
    assert "Invalid date format" in resp_bad_date.json()["detail"]

    # Invalid cutoff format
    resp_bad_cutoff = client.get("/api/accuracy/summary?cutoff_time=99:99")
    assert resp_bad_cutoff.status_code == 422
    assert "Invalid cutoff_time format" in resp_bad_cutoff.json()["detail"]

    # Date range error: date_to < date_from
    resp_bad_range = client.get("/api/accuracy/summary?date_from=2026-01-20&date_to=2026-01-10")
    assert resp_bad_range.status_code == 422
    assert "cannot be before date_from" in resp_bad_range.json()["detail"]


@pytest.mark.integration
def test_api_health():
    client = TestClient(app)
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["database"] == "sqlite_connected"
    assert data["records"]["actual_generation"] > 1400
    assert data["records"]["forecast_generation"] > 10000


@pytest.mark.integration
def test_api_forecasts_and_settlement_period_filter():
    client = TestClient(app)
    # Default parameters: 2026-01-02 to 2026-02-01 (1,488 points)
    resp_all = client.get("/api/forecasts")
    assert resp_all.status_code == 200
    all_data = resp_all.json()
    assert all_data["data_points"] == 1488

    # Specific date test (48 settlement periods)
    resp_day = client.get("/api/forecasts?date=2026-01-15&cutoff_time=09:20:00")
    assert resp_day.status_code == 200
    day_data = resp_day.json()
    assert day_data["data_points"] == 48
    assert "summary" in day_data
    assert day_data["summary"]["mae_mw"] > 0
    assert len(day_data["series"]) == 48

    # Filter for specific settlement period (e.g. SP 34 = 16:30-17:00 evening peak)
    resp_sp = client.get("/api/forecasts?date=2026-01-15&settlement_period=34")
    assert resp_sp.status_code == 200
    sp_data = resp_sp.json()
    assert sp_data["data_points"] == 1
    assert sp_data["series"][0]["settlement_period"] == 34
    assert sp_data["series"][0]["actual_mw"] > 0
    assert sp_data["series"][0]["forecast_mw"] > 0

    # Filter for settlement period range (e.g. SP 10 to SP 15)
    resp_sp_range = client.get("/api/forecasts?date=2026-01-15&settlement_period_from=10&settlement_period_to=15")
    assert resp_sp_range.status_code == 200
    range_data = resp_sp_range.json()
    assert range_data["data_points"] == 6


@pytest.mark.integration
def test_api_accuracy_summary():
    client = TestClient(app)
    resp_sum = client.get("/api/accuracy/summary")
    assert resp_sum.status_code == 200
    summary = resp_sum.json()
    assert summary["data_points"] == 1488
    assert summary["mae_mw"] > 0
    assert summary["wape_percent"] > 0
    assert summary["bias_mw"] != 0
    assert summary["p90_safety_margin_mw"] > 0


@pytest.mark.integration
def test_api_accuracy_diurnal():
    client = TestClient(app)
    resp_diurnal = client.get("/api/accuracy/diurnal")
    assert resp_diurnal.status_code == 200
    diurnal = resp_diurnal.json()
    assert len(diurnal) == 48
    for item in diurnal:
        assert item["settlement_period"] >= 1 and item["settlement_period"] <= 48
        assert item["count"] > 0
        assert item["time_label"] is not None
