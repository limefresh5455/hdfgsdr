import sqlite3
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "elexon_data.db")


def get_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    path = db_path or os.environ.get("DATABASE_PATH", DEFAULT_DB_PATH)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_db(db_path: Optional[str] = None) -> None:
    conn = get_connection(db_path)
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS actual_generation (
                    start_time TEXT NOT NULL,
                    settlement_date TEXT NOT NULL,
                    settlement_period INTEGER NOT NULL,
                    generation_mw REAL NOT NULL,
                    publish_time TEXT,
                    PRIMARY KEY (settlement_date, settlement_period)
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_actuals_start_time 
                ON actual_generation (start_time);
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_actuals_settlement_date 
                ON actual_generation (settlement_date);
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS forecast_generation (
                    publish_time TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    generation_mw REAL NOT NULL,
                    PRIMARY KEY (publish_time, start_time)
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_forecast_start_time 
                ON forecast_generation (start_time);
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_forecast_publish_time 
                ON forecast_generation (publish_time);
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS ingestion_status (
                    dataset_name TEXT PRIMARY KEY,
                    last_synced TEXT NOT NULL,
                    record_count INTEGER NOT NULL,
                    status TEXT NOT NULL
                );
            """)
    finally:
        conn.close()


def insert_actuals(records: List[Dict[str, Any]], db_path: Optional[str] = None) -> int:
    if not records:
        return 0
    conn = get_connection(db_path)
    try:
        with conn:
            conn.executemany("""
                INSERT OR REPLACE INTO actual_generation 
                (start_time, settlement_date, settlement_period, generation_mw, publish_time)
                VALUES (:start_time, :settlement_date, :settlement_period, :generation_mw, :publish_time)
            """, records)
        return len(records)
    finally:
        conn.close()


def insert_forecasts(records: List[Dict[str, Any]], db_path: Optional[str] = None) -> int:
    if not records:
        return 0
    conn = get_connection(db_path)
    try:
        with conn:
            conn.executemany("""
                INSERT OR REPLACE INTO forecast_generation 
                (publish_time, start_time, generation_mw)
                VALUES (:publish_time, :start_time, :generation_mw)
            """, records)
        return len(records)
    finally:
        conn.close()


def update_sync_status(dataset_name: str, count: int, status: str = "SUCCESS", db_path: Optional[str] = None) -> None:
    conn = get_connection(db_path)
    try:
        with conn:
            conn.execute("""
                INSERT OR REPLACE INTO ingestion_status (dataset_name, last_synced, record_count, status)
                VALUES (?, datetime('now'), ?, ?)
            """, (dataset_name, count, status))
    finally:
        conn.close()


def get_actuals_series(
    date_from: str, 
    date_to: str, 
    db_path: Optional[str] = None
) -> List[Dict[str, Any]]:
    conn = get_connection(db_path)
    try:
        cursor = conn.execute("""
            SELECT start_time, settlement_date, settlement_period, generation_mw, publish_time
            FROM actual_generation
            WHERE settlement_date >= ? AND settlement_date <= ?
            ORDER BY start_time ASC
        """, (date_from, date_to))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def get_day_ahead_forecasts_series(
    date_from: str,
    date_to: str,
    cutoff_time: str = "09:20:00",
    db_path: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Retrieves the day-ahead forecast for each half-hour in [date_from, date_to].
    For each target delivery date D, the day-ahead forecast is the latest forecast published
    on or before cutoff_time on Day D-1 (e.g. 09:20 UTC on D-1, corresponding to EPEX SPOT DA auction gate closure).
    """
    conn = get_connection(db_path)
    try:
        # Determine all delivery dates in range
        start_dt = datetime.strptime(date_from, "%Y-%m-%d").date()
        end_dt = datetime.strptime(date_to, "%Y-%m-%d").date()
        
        results = []
        cur_dt = start_dt
        while cur_dt <= end_dt:
            cur_date_str = cur_dt.strftime("%Y-%m-%d")
            # D-1 cutoff timestamp
            d_minus_1 = cur_dt - timedelta(days=1)
            cutoff_ts = f"{d_minus_1.strftime('%Y-%m-%d')}T{cutoff_time}Z"
            
            # Target day start and end timestamps
            day_start_ts = f"{cur_date_str}T00:00:00Z"
            day_end_ts = f"{cur_date_str}T23:30:00Z"
            
            cursor = conn.execute("""
                SELECT f.start_time, f.generation_mw, f.publish_time
                FROM forecast_generation f
                INNER JOIN (
                    SELECT start_time, MAX(publish_time) AS max_pub
                    FROM forecast_generation
                    WHERE start_time >= ? AND start_time <= ?
                      AND publish_time <= ?
                    GROUP BY start_time
                ) latest ON f.start_time = latest.start_time AND f.publish_time = latest.max_pub
                ORDER BY f.start_time ASC
            """, (day_start_ts, day_end_ts, cutoff_ts))
            
            for row in cursor.fetchall():
                results.append(dict(row))
            
            cur_dt += timedelta(days=1)
            
        return results
    finally:
        conn.close()


def get_metadata_info(db_path: Optional[str] = None) -> Dict[str, Any]:
    conn = get_connection(db_path)
    try:
        actuals_cnt = conn.execute("SELECT COUNT(*) FROM actual_generation").fetchone()[0]
        forecasts_cnt = conn.execute("SELECT COUNT(*) FROM forecast_generation").fetchone()[0]
        
        act_dates = conn.execute("""
            SELECT MIN(settlement_date), MAX(settlement_date) 
            FROM actual_generation
        """).fetchone()
        
        for_times = conn.execute("""
            SELECT MIN(start_time), MAX(start_time), MIN(publish_time), MAX(publish_time)
            FROM forecast_generation
        """).fetchone()
        
        sync_rows = conn.execute("SELECT dataset_name, last_synced, record_count, status FROM ingestion_status").fetchall()
        sync_info = {row["dataset_name"]: dict(row) for row in sync_rows}
        
        return {
            "actuals_count": actuals_cnt,
            "forecasts_count": forecasts_cnt,
            "actuals_date_min": act_dates[0] if act_dates else None,
            "actuals_date_max": act_dates[1] if act_dates else None,
            "forecasts_start_min": for_times[0] if for_times else None,
            "forecasts_start_max": for_times[1] if for_times else None,
            "forecasts_publish_min": for_times[2] if for_times else None,
            "forecasts_publish_max": for_times[3] if for_times else None,
            "sync_status": sync_info
        }
    finally:
        conn.close()
