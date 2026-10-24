from typing import List, Optional, Dict
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    database: str
    records: Dict[str, int]


class ForecastDataPoint(BaseModel):
    start_time: str
    settlement_date: Optional[str] = None
    settlement_period: Optional[int] = None
    actual_mw: Optional[float] = None
    forecast_mw: float
    error_mw: Optional[float] = None
    abs_error_mw: Optional[float] = None
    publish_time: Optional[str] = None


class AccuracySummaryResponse(BaseModel):
    data_points: int
    mae_mw: float
    rmse_mw: float
    wape_percent: float
    bias_mw: float
    mean_actual_mw: float
    mean_forecast_mw: float
    min_error_mw: float
    max_error_mw: float
    std_error_mw: float
    p10_error_mw: float
    p50_error_mw: float
    p90_error_mw: float
    p90_safety_margin_mw: float
    correlation: float


class ForecastSeriesResponse(BaseModel):
    date_from: str
    date_to: str
    cutoff_time: str
    data_points: int
    summary: AccuracySummaryResponse
    series: List[ForecastDataPoint]


class DiurnalItem(BaseModel):
    settlement_period: int
    time_label: str
    count: int
    mean_actual_mw: float
    mean_forecast_mw: float
    mae_mw: float
    rmse_mw: float
    bias_mw: float
    wape_percent: float
    p90_safety_margin_mw: float
