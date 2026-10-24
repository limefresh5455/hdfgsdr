import os
import re
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import (
    init_db,
    get_actuals_series,
    get_day_ahead_forecasts_series,
    get_metadata_info
)
from analytics import (
    align_actuals_and_forecasts,
    compute_accuracy_summary,
    compute_diurnal_breakdown
)
from models import (
    HealthResponse,
    ForecastSeriesResponse,
    AccuracySummaryResponse,
    DiurnalItem
)

logger = logging.getLogger("app")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# Defaults based on UK Day-Ahead electricity market rules:
# Purchase decisions made throughout January 2026 correspond to delivery dates 2026-01-02 to 2026-02-01.
DEFAULT_DATE_FROM = "2026-01-02"
DEFAULT_DATE_TO = "2026-02-01"
# EPEX SPOT GB Day-Ahead order book gate closure is 09:20 UK time (Nord Pool is 09:50 UK time)
DEFAULT_CUTOFF_TIME = "09:20:00"


def resolve_str(val: Any, default: Optional[str] = None) -> Optional[str]:
    """Helper enabling direct Python invocation of route functions in unit tests."""
    return val if isinstance(val, str) else default


def validate_date(date_str: str, field_name: str = "date") -> str:
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return date_str
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=422, 
            detail=f"Invalid {field_name} format '{date_str}'. Expected YYYY-MM-DD."
        )


def validate_date_range(d_from: str, d_to: str) -> None:
    dt_from = datetime.strptime(d_from, "%Y-%m-%d").date()
    dt_to = datetime.strptime(d_to, "%Y-%m-%d").date()
    if dt_to < dt_from:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid date range: date_to ('{d_to}') cannot be before date_from ('{d_from}')."
        )


def validate_cutoff(cutoff_str: str) -> str:
    if not isinstance(cutoff_str, str) or not re.match(r"^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$", cutoff_str):
        raise HTTPException(
            status_code=422, 
            detail=f"Invalid cutoff_time format '{cutoff_str}'. Expected HH:MM:SS or HH:MM."
        )
    if len(cutoff_str) == 5:
        return f"{cutoff_str}:00"
    return cutoff_str


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    init_db()
    meta = get_metadata_info()
    logger.info(
        f"Database initialized. Records: {meta['actuals_count']} actuals, "
        f"{meta['forecasts_count']} forecasts."
    )
    yield
    logger.info("Application shutting down.")


app = FastAPI(
    title="UK Wind Day-Ahead Procurement Intelligence API",
    description="Elexon BMRS Wind Generation Forecast & Accuracy Analytics for UK Day-Ahead Electricity Trading",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse, tags=["System"])
def get_health():
    """
    Check that the API and database are available.
    """
    meta = get_metadata_info()
    return {
        "status": "healthy",
        "database": "sqlite_connected",
        "records": {
            "actual_generation": meta["actuals_count"],
            "forecast_generation": meta["forecasts_count"]
        }
    }


@app.get("/api/forecasts", response_model=ForecastSeriesResponse, tags=["Trading & Procurement"])
def get_forecasts(
    date: Optional[str] = Query(None, description="Specific delivery date (YYYY-MM-DD), e.g. 2026-01-15"),
    date_from: Optional[str] = Query(None, description=f"Start delivery date (YYYY-MM-DD), defaults to {DEFAULT_DATE_FROM}"),
    date_to: Optional[str] = Query(None, description=f"End delivery date (YYYY-MM-DD), defaults to {DEFAULT_DATE_TO}"),
    cutoff_time: str = Query(DEFAULT_CUTOFF_TIME, description="D-1 Day-Ahead Cutoff Time (HH:MM:SS), defaults to 09:20:00"),
    settlement_period: Optional[int] = Query(None, ge=1, le=48, description="Filter for a specific settlement period (1-48)"),
    settlement_period_from: Optional[int] = Query(None, ge=1, le=48, description="Start settlement period (1-48)"),
    settlement_period_to: Optional[int] = Query(None, ge=1, le=48, description="End settlement period (1-48)")
):
    """
    Return day-ahead wind forecasts for the selected delivery dates and settlement periods.
    """
    valid_cutoff = validate_cutoff(resolve_str(cutoff_time, DEFAULT_CUTOFF_TIME))
    date_str = resolve_str(date, None)
    if date_str:
        valid_date = validate_date(date_str, "date")
        d_from = valid_date
        d_to = valid_date
    else:
        d_from = validate_date(resolve_str(date_from, DEFAULT_DATE_FROM), "date_from")
        d_to = validate_date(resolve_str(date_to, DEFAULT_DATE_TO), "date_to")
        validate_date_range(d_from, d_to)

    actuals = get_actuals_series(d_from, d_to)
    forecasts = get_day_ahead_forecasts_series(d_from, d_to, cutoff_time=valid_cutoff)
    aligned = align_actuals_and_forecasts(actuals, forecasts)

    # Optional settlement period filtering
    if settlement_period is not None:
        aligned = [pt for pt in aligned if pt.get("settlement_period") == settlement_period]
    else:
        if settlement_period_from is not None:
            aligned = [pt for pt in aligned if pt.get("settlement_period", 0) >= settlement_period_from]
        if settlement_period_to is not None:
            aligned = [pt for pt in aligned if pt.get("settlement_period", 0) <= settlement_period_to]

    summary = compute_accuracy_summary(aligned)

    return {
        "date_from": d_from,
        "date_to": d_to,
        "cutoff_time": valid_cutoff,
        "data_points": len(aligned),
        "summary": summary,
        "series": aligned
    }


@app.get("/api/accuracy/summary", response_model=AccuracySummaryResponse, tags=["Analytics"])
def get_accuracy_summary(
    date_from: Optional[str] = Query(None, description=f"Start date (YYYY-MM-DD), defaults to {DEFAULT_DATE_FROM}"),
    date_to: Optional[str] = Query(None, description=f"End date (YYYY-MM-DD), defaults to {DEFAULT_DATE_TO}"),
    cutoff_time: str = Query(DEFAULT_CUTOFF_TIME, description="D-1 Day-Ahead Cutoff Time (HH:MM:SS)")
):
    """
    Calculate forecast accuracy metrics: MAE, RMSE, bias, WAPE and P90 wind shortfall indicator.
    """
    d_from = validate_date(resolve_str(date_from, DEFAULT_DATE_FROM), "date_from")
    d_to = validate_date(resolve_str(date_to, DEFAULT_DATE_TO), "date_to")
    validate_date_range(d_from, d_to)
    valid_cutoff = validate_cutoff(resolve_str(cutoff_time, DEFAULT_CUTOFF_TIME))

    actuals = get_actuals_series(d_from, d_to)
    forecasts = get_day_ahead_forecasts_series(d_from, d_to, cutoff_time=valid_cutoff)
    aligned = align_actuals_and_forecasts(actuals, forecasts)
    return compute_accuracy_summary(aligned)


@app.get("/api/accuracy/diurnal", response_model=List[DiurnalItem], tags=["Analytics"])
def get_diurnal_breakdown(
    date_from: Optional[str] = Query(None, description=f"Start date (YYYY-MM-DD), defaults to {DEFAULT_DATE_FROM}"),
    date_to: Optional[str] = Query(None, description=f"End date (YYYY-MM-DD), defaults to {DEFAULT_DATE_TO}"),
    cutoff_time: str = Query(DEFAULT_CUTOFF_TIME, description="D-1 Day-Ahead Cutoff Time (HH:MM:SS)")
):
    """
    Show forecast accuracy by half-hour settlement period to identify recurring patterns.
    """
    d_from = validate_date(resolve_str(date_from, DEFAULT_DATE_FROM), "date_from")
    d_to = validate_date(resolve_str(date_to, DEFAULT_DATE_TO), "date_to")
    validate_date_range(d_from, d_to)
    valid_cutoff = validate_cutoff(resolve_str(cutoff_time, DEFAULT_CUTOFF_TIME))

    actuals = get_actuals_series(d_from, d_to)
    forecasts = get_day_ahead_forecasts_series(d_from, d_to, cutoff_time=valid_cutoff)
    aligned = align_actuals_and_forecasts(actuals, forecasts)
    return compute_diurnal_breakdown(aligned)
