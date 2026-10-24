import math
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime


def align_actuals_and_forecasts(
    actuals: List[Dict[str, Any]], 
    forecasts: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Pairs actual generation with forecast generation on matching start_time.
    Calculates residual, error, and absolute error for each settlement period.
    """
    forecast_map = {f["start_time"]: f for f in forecasts}
    
    aligned = []
    for act in actuals:
        st = act["start_time"]
        # Exact match or fall back to hourly forecast for the corresponding half-hour
        fc = forecast_map.get(st)
        if fc is None and len(st) >= 14 and st[14:16] == "30":
            hourly_st = st[:14] + "00:00Z"
            fc = forecast_map.get(hourly_st)
            
        if fc is not None:
            act_mw = float(act["generation_mw"])
            fc_mw = float(fc["generation_mw"])
            err_mw = fc_mw - act_mw        # Positive = Over-forecast, Negative = Under-forecast
            abs_err = abs(err_mw)
            
            aligned.append({
                "start_time": st,
                "settlement_date": act.get("settlement_date"),
                "settlement_period": act.get("settlement_period"),
                "actual_mw": round(act_mw, 2),
                "forecast_mw": round(fc_mw, 2),
                "error_mw": round(err_mw, 2),
                "abs_error_mw": round(abs_err, 2),
                "publish_time": fc.get("publish_time")
            })
            
    return aligned


def compute_accuracy_summary(aligned: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes global quantitative KPIs: MAE, RMSE, WAPE, Bias, Std Dev, and Safety Margins.
    """
    n = len(aligned)
    if n == 0:
        return {
            "data_points": 0,
            "mae_mw": 0.0,
            "rmse_mw": 0.0,
            "wape_percent": 0.0,
            "bias_mw": 0.0,
            "mean_actual_mw": 0.0,
            "mean_forecast_mw": 0.0,
            "min_error_mw": 0.0,
            "max_error_mw": 0.0,
            "std_error_mw": 0.0,
            "p10_error_mw": 0.0,
            "p50_error_mw": 0.0,
            "p90_error_mw": 0.0,
            "p90_safety_margin_mw": 0.0,
            "correlation": 0.0
        }
        
    actuals = [d["actual_mw"] for d in aligned]
    forecasts = [d["forecast_mw"] for d in aligned]
    errors = [d["error_mw"] for d in aligned]
    abs_errors = [d["abs_error_mw"] for d in aligned]
    
    sum_actual = sum(actuals)
    sum_abs_err = sum(abs_errors)
    sum_err = sum(errors)
    
    mae = sum_abs_err / n
    rmse = math.sqrt(sum(e * e for e in errors) / n)
    wape = (sum_abs_err / sum_actual * 100.0) if sum_actual > 0 else 0.0
    bias = sum_err / n
    mean_actual = sum_actual / n
    mean_forecast = sum(forecasts) / n
    
    # Standard deviation of errors
    var_err = sum((e - bias) ** 2 for e in errors) / n
    std_err = math.sqrt(var_err)
    
    # Percentiles
    sorted_errors = sorted(errors)
    def percentile(arr, p):
        k = (len(arr) - 1) * p
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return arr[int(k)]
        return arr[int(f)] * (c - k) + arr[int(c)] * (k - f)

    p10 = percentile(sorted_errors, 0.10)
    p50 = percentile(sorted_errors, 0.50)
    p90 = percentile(sorted_errors, 0.90)
    
    # Recommended safety reserve margin (MW):
    # Error is defined as (forecast - actual). The P90 safety margin is a historical
    # forecast-error indicator calculated as the 90th percentile of forecast errors,
    # floored at zero. It helps quantify historical wind under-generation risk but
    # does not guarantee 90% coverage in future settlement periods.
    safety_margin = max(0.0, p90)
    
    # Pearson Correlation between actual and forecast
    mean_a = mean_actual
    mean_f = mean_forecast
    cov = sum((a - mean_a) * (f - mean_f) for a, f in zip(actuals, forecasts)) / n
    var_a = sum((a - mean_a) ** 2 for a in actuals) / n
    var_f = sum((f - mean_f) ** 2 for f in forecasts) / n
    std_a = math.sqrt(var_a)
    std_f = math.sqrt(var_f)
    corr = (cov / (std_a * std_f)) if (std_a > 0 and std_f > 0) else 1.0

    return {
        "data_points": n,
        "mae_mw": round(mae, 2),
        "rmse_mw": round(rmse, 2),
        "wape_percent": round(wape, 2),
        "bias_mw": round(bias, 2),
        "mean_actual_mw": round(mean_actual, 2),
        "mean_forecast_mw": round(mean_forecast, 2),
        "min_error_mw": round(min(errors), 2),
        "max_error_mw": round(max(errors), 2),
        "std_error_mw": round(std_err, 2),
        "p10_error_mw": round(p10, 2),
        "p50_error_mw": round(p50, 2),
        "p90_error_mw": round(p90, 2),
        "p90_safety_margin_mw": round(safety_margin, 2),
        "correlation": round(corr, 4)
    }


def compute_diurnal_breakdown(aligned: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Groups errors by settlement period (1 to 48) to reveal time-of-day accuracy patterns.
    """
    sp_groups: Dict[int, List[Dict[str, Any]]] = {sp: [] for sp in range(1, 49)}
    for row in aligned:
        sp = row.get("settlement_period")
        if sp in sp_groups:
            sp_groups[sp].append(row)
            
    diurnal_stats = []
    for sp in range(1, 49):
        items = sp_groups[sp]
        # Calculate human-readable half-hour range
        start_min_total = (sp - 1) * 30
        end_min_total = sp * 30
        h1, m1 = divmod(start_min_total, 60)
        h2, m2 = divmod(end_min_total, 60)
        time_label = f"{h1:02d}:{m1:02d} - {h2:02d}:{m2:02d}"
        
        if not items:
            diurnal_stats.append({
                "settlement_period": sp,
                "time_label": time_label,
                "count": 0,
                "mean_actual_mw": 0.0,
                "mean_forecast_mw": 0.0,
                "mae_mw": 0.0,
                "rmse_mw": 0.0,
                "bias_mw": 0.0,
                "wape_percent": 0.0,
                "p90_safety_margin_mw": 0.0
            })
            continue
            
        summary = compute_accuracy_summary(items)
        diurnal_stats.append({
            "settlement_period": sp,
            "time_label": time_label,
            "count": summary["data_points"],
            "mean_actual_mw": summary["mean_actual_mw"],
            "mean_forecast_mw": summary["mean_forecast_mw"],
            "mae_mw": summary["mae_mw"],
            "rmse_mw": summary["rmse_mw"],
            "bias_mw": summary["bias_mw"],
            "wape_percent": summary["wape_percent"],
            "p90_safety_margin_mw": summary["p90_safety_margin_mw"]
        })
        
    return diurnal_stats
