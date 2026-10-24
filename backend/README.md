# UK Wind Day-Ahead Procurement Intelligence - Backend

Python FastAPI service for UK wholesale electricity trading. It ingests, normalizes, and analyzes national-level wind actuals (`FUELHH`) and forecasts (`WINDFOR`) from Elexon BMRS for January 2026 purchase decisions.

---

## Domain & Market Mechanics

### 1. Day-Ahead Gate Closure & Cutoff Selection
* **Default Cutoff: 09:20 UTC/GMT**
* In the UK wholesale electricity market, day-ahead power contracts for delivery on day $D$ are auctioned on day $D-1$ before power exchange gate closure:
  * **EPEX SPOT GB Day-Ahead Auction:** Order book gate closure is at **09:20 UK time** (see [ECC Clearing Circular 34/2020](https://www.ecc.de/ecc-en/news-info/circulars/member-circulars-detail/ecc-clearing-circular-34-2020) and [EPEX SPOT Trading Products](https://www.epexspot.com/en/trading-products#day-ahead)).
  * **Nord Pool / N2EX GB Day-Ahead Auction:** Order book gate closure is at **09:50 UK time** (see [Nord Pool Support: About the Day Ahead GB Auction](https://support.nordpoolgroup.com/hc/en-u/articles/360004123519-Day-Ahead-GB-Auction)).
* **Conservative Cutoff Choice:** Setting the default cutoff to **09:20 UTC** represents the conservative choice: any procurement decision finalized by 09:20 UTC is guaranteed to be actionable across both EPEX SPOT and Nord Pool, whereas waiting until 09:50 would miss the EPEX SPOT auction. The cutoff remains fully configurable via the `cutoff_time` parameter.

### 2. January Scope & Delivery Date Interpretation
* The project requires data relevant for purchase decisions made in **January 2026**.
* Because wholesale electricity purchase decisions are executed on day $D-1$ for physical delivery on day $D$:
  * Decisions made on **January 1, 2026** purchase power for delivery on **January 2, 2026**.
  * Decisions made on **January 31, 2026** purchase power for delivery on **February 1, 2026**.
* Consequently, the relevant physical delivery window is **2026-01-02 to 2026-02-01** (31 delivery days $\times$ 48 settlement periods = 1,488 half-hour settlement periods). The API endpoints default to this delivery date range.

### 3. Resolution Alignment: Half-Hourly Actuals vs Hourly Forecasts
* **`FUELHH` (Actual Generation):** Published at 30-minute settlement period resolution (48 settlement periods per day).
* **`WINDFOR` (Forecast Generation):** Published by National Grid / NESO at 60-minute resolution (`00:00`, `01:00`, ..., `23:00`).
* In the UK power market, an hourly forecast represents expected average generation across the hour. The service aligns actuals and forecasts by matching each half-hour settlement period to its corresponding forecast: the `:00` period matches directly, and the `:30` settlement period references the same hourly forecast value.
* **Matched Intervals in `/api/forecasts`:** Rather than independently returning every available forecast interval, `/api/forecasts` returns matched actual and forecast intervals where both exist for the half-hour settlement period. If a forecast is unavailable for a settlement period, that interval is excluded from the returned series (not returned with `null`).

### 4. Settlement Periods vs UTC Time
* Great Britain's electricity settlement day is divided into 48 half-hour Settlement Periods (SP 1 = 00:00–00:30, ..., SP 48 = 23:30–24:00).
* **Timezone note:** Settlement Period clock time aligns with UTC (GMT) only during the winter period (late October to late March). During British Summer Time (BST, UTC+1), clock settlement times shift by +1 hour relative to UTC. Because January is in winter, settlement periods directly align with UTC timestamps.

### 5. Quantitative Safety Margin Calculation
* Forecast error is defined as:
  $$\text{Error}_i = \text{Forecast}_i - \text{Actual}_i \quad (\text{MW})$$
* The operational procurement risk for a utility is **wind under-generation** (actual wind coming in below forecast), which produces a positive error $(\text{Forecast} > \text{Actual})$.
* To mitigate unhedged balancing exposure and imbalance cash-out penalties, the recommended **P90 Safety Reserve Buffer** is calculated as:
  $$\text{Safety Margin} = \max(0.0, P_{90}(\text{Error}))$$
  The P90 safety margin is a historical forecast-error indicator calculated as the 90th percentile of forecast errors, floored at zero. It helps quantify historical wind under-generation risk but does not guarantee 90% coverage in future settlement periods.

### 6. Forecast Accuracy Metrics & Calculation Formulas

The service evaluates day-ahead forecast performance using statistical error metrics computed over the aligned $N$ half-hour settlement periods in `analytics.py`:

#### a. Residual Forecast Error ($e_i$)
The raw signed deviation between day-ahead forecast and realized actual generation for each settlement period $i$:
$$e_i = \text{Forecast}_i - \text{Actual}_i \quad (\text{MW})$$
* $e_i > 0$: **Over-forecast (Shortfall Deficit)** — actual wind generation is lower than predicted, creating balancing risk.
* $e_i < 0$: **Under-forecast (Surplus)** — actual wind generation exceeds prediction.

#### b. Mean Squared Error (MSE)
Measures the average squared difference between forecast and actual generation, penalizing large individual deviations quadratically. (Note: MSE serves as the intermediate calculation for RMSE; the API returns RMSE directly in MW):
$$\text{MSE} = \frac{1}{N} \sum_{i=1}^{N} (\text{Forecast}_i - \text{Actual}_i)^2 = \frac{1}{N} \sum_{i=1}^{N} e_i^2 \quad (\text{MW}^2)$$

#### c. Root Mean Squared Error (RMSE)
RMSE measures the square root of the average squared forecast error, penalizing larger errors more heavily than MAE. It is expressed in MW:
$$\text{RMSE} = \sqrt{\text{MSE}} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (\text{Forecast}_i - \text{Actual}_i)^2} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} e_i^2} \quad (\text{MW})$$

#### d. Mean Absolute Error (MAE)
The arithmetic average of absolute errors across all settlement periods, providing a linear and robust measure of overall forecast error magnitude:
$$\text{MAE} = \frac{1}{N} \sum_{i=1}^{N} |\text{Forecast}_i - \text{Actual}_i| = \frac{1}{N} \sum_{i=1}^{N} |e_i| \quad (\text{MW})$$

#### e. Forecast Bias (Mean Error)
The arithmetic mean of signed errors, identifying whether the model exhibits systematic directional over-forecasting or under-forecasting:
$$\text{Bias} = \frac{1}{N} \sum_{i=1}^{N} (\text{Forecast}_i - \text{Actual}_i) = \frac{1}{N} \sum_{i=1}^{N} e_i \quad (\text{MW})$$
* $\text{Bias} > 0$: Systematic over-forecasting.
* $\text{Bias} < 0$: Systematic under-forecasting.

#### f. Weighted Absolute Percentage Error (WAPE)
WAPE measures total absolute forecast error relative to total actual wind generation over the evaluation period:
$$\text{WAPE} = \frac{\sum_{i=1}^{N} |\text{Forecast}_i - \text{Actual}_i|}{\sum_{i=1}^{N} \text{Actual}_i} \times 100\% = \frac{\sum_{i=1}^{N} |e_i|}{\sum_{i=1}^{N} \text{Actual}_i} \times 100\% \quad (\%)$$
WAPE is mathematically undefined when the sum of actual generation over the evaluation period is zero ($\sum_{i=1}^{N} \text{Actual}_i = 0$). In `analytics.py`, this edge case is explicitly guarded and returns `0.0` to avoid division-by-zero errors.

#### g. Error Standard Deviation ($\sigma_e$)
Measures the dispersion of individual forecast errors around the systematic bias (returned as a supplementary metric `std_error_mw` in `/api/accuracy/summary`):
$$\sigma_e = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (e_i - \text{Bias})^2} \quad (\text{MW})$$

#### Summary Matrix of Metrics

| Metric | Symbol | Mathematical Formula | Units | API Field | Trading & Operational Interpretation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Error** | $e_i$ | $\text{Forecast}_i - \text{Actual}_i$ | MW | `error_mw` | Point-in-time shortfall ($>0$) or surplus ($<0$). |
| **MSE** | $\text{MSE}$ | $\frac{1}{N} \sum e_i^2$ | $\text{MW}^2$ | *(Intermediate)* | Variance metric heavily penalizing extreme forecast misses; used to compute RMSE. |
| **RMSE** | $\text{RMSE}$ | $\sqrt{\frac{1}{N} \sum e_i^2}$ | MW | `rmse_mw` | Square root of average squared error, penalizing larger errors more heavily than MAE. |
| **MAE** | $\text{MAE}$ | $\frac{1}{N} \sum \|e_i\|$ | MW | `mae_mw` | Expected magnitude of volume imbalance per settlement period. |
| **Bias** | $\text{Bias}$ | $\frac{1}{N} \sum e_i$ | MW | `bias_mw` | Systematic directional error in day-ahead position sizing. |
| **WAPE** | $\text{WAPE}$ | $\frac{\sum \|e_i\|}{\sum \text{Actual}_i} \times 100\%$ | % | `wape_percent` | Total absolute error relative to total actual generation; undefined if sum of actuals is zero (returns 0.0). |
| **P90 Margin** | $\text{P90}$ | $\max(0, P_{90}(e_i))$ | MW | `p90_safety_margin_mw` | Historical P90 positive forecast-error indicator used to assess potential wind shortfall risk; not a guarantee of future coverage. |
| **Error Std Dev** | $\sigma_e$ | $\sqrt{\frac{1}{N} \sum (e_i - \text{Bias})^2}$ | MW | `std_error_mw` | Supplementary metric in `/api/accuracy/summary` measuring dispersion around bias. |

---

## System Architecture

```
backend/
├── app.py             # FastAPI entrypoint, routes, input validation & CORS
├── database.py        # SQLite queries, indexing & cutoff vintage selection
├── ingestion.py       # Elexon BMRS API client for FUELHH & WINDFOR
├── analytics.py       # Metric calculations (MAE, RMSE, WAPE, Bias, P90, Diurnal)
├── models.py          # Pydantic schemas for requests and responses
├── test_backend.py    # Unit and integration test suite
├── elexon_data.db     # Primed SQLite database (1,536 actuals + 19,856 forecasts)
├── requirements.txt   # Python dependencies
├── pytest.ini         # Pytest configuration and marker registration
├── Dockerfile         # Container definition
└── run.py             # Server launcher script
```

---

## Deployment Strategy: Heroku with Docker

* **Why not Vercel?** Serverless platforms like Vercel operate with a read-only, ephemeral filesystem. This breaks SQLite Write-Ahead Logging (WAL) mode, file locks, and local database access.
* **Heroku / Docker:** The application is packaged as a standard Docker container (`Dockerfile`, `heroku.yml`). Heroku container runtime supports long-running processes, local file reads, and standard SQLite execution.

---

## Local Development & Setup

### 1. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Run Test Suite
To run all tests (including database integration tests):
```bash
pytest backend/test_backend.py -v
```
To run only isolated unit tests:
```bash
pytest backend/test_backend.py -m "not integration" -v
```

### 3. Start the Backend Server
```bash
python3 backend/run.py
```
Or via Uvicorn:
```bash
uvicorn app:app --app-dir backend --host 0.0.0.0 --port 8000
```
Swagger API documentation: `http://localhost:8000/docs`

---

## Running with Docker

Build and run locally:
```bash
docker build -t uk-wind-backend ./backend
docker run -p 8000:8000 uk-wind-backend
```
Or using Docker Compose from the repository root:
```bash
docker compose up --build
```

---

## API Endpoints

| Endpoint | Method | Key Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/api/forecasts` | GET | `date`, `date_from`, `date_to`, `cutoff_time`, `settlement_period` | Return matched day-ahead forecast and actual generation intervals for the selected delivery dates and settlement periods. |
| `/api/accuracy/summary` | GET | `date_from`, `date_to`, `cutoff_time` | Calculate forecast accuracy metrics: MAE, RMSE, bias, WAPE and P90 wind shortfall indicator. |
| `/api/accuracy/diurnal` | GET | `date_from`, `date_to`, `cutoff_time` | Show forecast accuracy by half-hour settlement period to identify recurring patterns. |
| `/api/health` | GET | - | Check that the API and database are available. |

---

## AI Tools Disclosure
As required by the assignment guidelines, AI tools (Google Antigravity / Gemini) were utilized for code implementation, architectural design, data exploration, and automated testing.
