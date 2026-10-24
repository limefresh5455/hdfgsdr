import time
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import urllib.request
import json

from database import (
    init_db,
    insert_actuals,
    insert_forecasts,
    update_sync_status,
    get_metadata_info
)

logger = logging.getLogger("ingestion")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

BASE_API_URL = "https://data.elexon.co.uk/bmrs/api/v1"
HEADERS = {"User-Agent": "UK-Wind-DayAhead-Procurement/1.0", "Accept": "application/json"}


def fetch_url_json(url: str, retries: int = 3, timeout: int = 30) -> Any:
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status == 200:
                    data = resp.read().decode("utf-8")
                    return json.loads(data)
                logger.warning(f"Fetch {url} returned HTTP {resp.status}, attempt {attempt}/{retries}")
        except Exception as e:
            logger.warning(f"Error fetching {url}: {e}, attempt {attempt}/{retries}")
            if attempt == retries:
                raise e
            time.sleep(1.5 * attempt)
    return []


def ingest_actuals_chunk(date_from: str, date_to: str, db_path: Optional[str] = None) -> int:
    """
    Ingests actual generation from FUELHH/stream for a settlement date window.
    Filters exclusively for fuelType == 'WIND'.
    """
    url = f"{BASE_API_URL}/datasets/FUELHH/stream?settlementDateFrom={date_from}&settlementDateTo={date_to}"
    logger.info(f"Ingesting FUELHH actuals from {date_from} to {date_to}...")
    raw_data = fetch_url_json(url)
    
    wind_records = []
    for item in raw_data:
        if item.get("fuelType") == "WIND":
            wind_records.append({
                "start_time": item.get("startTime"),
                "settlement_date": item.get("settlementDate"),
                "settlement_period": item.get("settlementPeriod"),
                "generation_mw": float(item.get("generation", 0.0)),
                "publish_time": item.get("publishTime")
            })
            
    count = insert_actuals(wind_records, db_path=db_path)
    logger.info(f"Saved {count} WIND actual generation records.")
    return count


def ingest_forecasts_chunk(publish_from: str, publish_to: str, db_path: Optional[str] = None) -> int:
    """
    Ingests wind forecasts from WINDFOR/stream for a publication timestamp window.
    """
    url = f"{BASE_API_URL}/datasets/WINDFOR/stream?publishDateTimeFrom={publish_from}&publishDateTimeTo={publish_to}"
    logger.info(f"Ingesting WINDFOR forecasts published from {publish_from} to {publish_to}...")
    raw_data = fetch_url_json(url)
    
    forecast_records = []
    for item in raw_data:
        pub_t = item.get("publishTime")
        start_t = item.get("startTime")
        gen = item.get("generation")
        if pub_t and start_t and gen is not None:
            forecast_records.append({
                "publish_time": pub_t,
                "start_time": start_t,
                "generation_mw": float(gen)
            })
            
    count = insert_forecasts(forecast_records, db_path=db_path)
    logger.info(f"Saved {count} WINDFOR forecast records.")
    return count


def seed_january_2026(db_path: Optional[str] = None, force: bool = False) -> Dict[str, Any]:
    """
    Fully seeds January 2026 actuals and forecast vintages from Elexon BMRS API.
    Covers purchase decisions made in Jan 2026 for physical delivery from 2026-01-02 to 2026-02-01.
    """
    init_db(db_path)
    meta = get_metadata_info(db_path)
    
    if not force and meta["actuals_count"] >= 1488 and meta["forecasts_count"] >= 5000:
        logger.info(f"Database already seeded ({meta['actuals_count']} actuals, {meta['forecasts_count']} forecasts). Skipping seed.")
        return {"status": "ALREADY_SEEDED", "metadata": meta}
    
    logger.info("Starting January 2026 data seeding from Elexon BMRS...")
    start_time = time.time()
    
    total_actuals = 0
    # Ingest actuals in weekly chunks from 2026-01-01 to 2026-02-01
    actual_chunks = [
        ("2026-01-01", "2026-01-07"),
        ("2026-01-08", "2026-01-14"),
        ("2026-01-15", "2026-01-21"),
        ("2026-01-22", "2026-01-28"),
        ("2026-01-29", "2026-02-01")
    ]
    for d_from, d_to in actual_chunks:
        cnt = ingest_actuals_chunk(d_from, d_to, db_path)
        total_actuals += cnt
        time.sleep(0.3)
        
    update_sync_status("FUELHH_WIND", total_actuals, "SUCCESS", db_path)
    
    total_forecasts = 0
    # Ingest WINDFOR forecasts published between 2025-12-30 and 2026-02-01
    # 5-day chunks
    forecast_chunks = [
        ("2025-12-30T00:00:00Z", "2026-01-05T00:00:00Z"),
        ("2026-01-05T00:00:00Z", "2026-01-11T00:00:00Z"),
        ("2026-01-11T00:00:00Z", "2026-01-17T00:00:00Z"),
        ("2026-01-17T00:00:00Z", "2026-01-23T00:00:00Z"),
        ("2026-01-23T00:00:00Z", "2026-01-29T00:00:00Z"),
        ("2026-01-29T00:00:00Z", "2026-02-02T00:00:00Z")
    ]
    for p_from, p_to in forecast_chunks:
        cnt = ingest_forecasts_chunk(p_from, p_to, db_path)
        total_forecasts += cnt
        time.sleep(0.3)
        
    update_sync_status("WINDFOR", total_forecasts, "SUCCESS", db_path)
    
    duration = time.time() - start_time
    logger.info(f"Seeding completed in {duration:.2f} seconds. Actuals: {total_actuals}, Forecasts: {total_forecasts}")
    
    final_meta = get_metadata_info(db_path)
    return {
        "status": "SUCCESS",
        "duration_seconds": round(duration, 2),
        "total_actuals": total_actuals,
        "total_forecasts": total_forecasts,
        "metadata": final_meta
    }


if __name__ == "__main__":
    seed_january_2026(force=True)
