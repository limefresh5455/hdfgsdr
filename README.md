# UK Wind Day-Ahead Forecast Accuracy & Evaluation

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite)](https://vite.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://docker.com)
[![Tests](https://img.shields.io/badge/Pytest-10%2F10%20Passing-brightgreen?logo=pytest)](https://pytest.org)

An evaluation dashboard and FastAPI backend for assessing UK day-ahead wind generation forecasts against realized generation for January 2026 purchase decisions. The system analyzes national-level wind actuals (`FUELHH`) and day-ahead forecasts (`WINDFOR`) from Elexon BMRS to compute error metrics (MAE, RMSE, WAPE, Bias, and P90 Safety Margin) and visualize half-hourly diurnal accuracy patterns.

---

## Domain Methodology

1. **Day-Ahead Auction Cutoff (Default: 09:20 UTC)**
   * In the UK wholesale electricity market, contracts for physical delivery on day $D$ are traded on day $D-1$ before power exchange gate closure:
     * **EPEX SPOT GB Day-Ahead Auction**: Order book gate closure is at **09:20 UK time** ([ECC Circular 34/2020](https://www.ecc.de/ecc-en/news-info/circulars/member-circulars-detail/ecc-clearing-circular-34-2020)).
     * **Nord Pool GB Day-Ahead Auction**: Order book gate closure is at **09:50 UK time** ([Nord Pool Support: About Day Ahead GB Auction](https://support.nordpoolgroup.com/hc/en-u/articles/360004123519-Day-Ahead-GB-Auction)).
   * Defaulting to **09:20 UTC** is the conservative, risk-defensive choice: decisions finalized by 09:20 UTC are actionable across both power exchanges. Zero lookahead data leakage is permitted.

2. **January Scope (Delivery Window: 2 Jan – 1 Feb 2026)**
   * Decisions made throughout January (1 Jan to 31 Jan) procure power for delivery between **2026-01-02 and 2026-02-01** (31 delivery days $\times$ 48 settlement periods = **1,488 half-hour settlement periods**).

3. **P90 Safety Margin Calculation**
   * Forecast error is defined as $e_t = \text{Forecast}_t - \text{Actual}_t$.
   * Under-generation (actual wind below forecast) corresponds to a positive error.
   * The P90 safety margin is calculated as $\max(0.0, P_{90}(e_t))$. The P90 safety margin is a historical forecast-error indicator calculated as the 90th percentile of forecast errors, floored at zero. It helps quantify historical wind under-generation risk but does not guarantee 90% coverage in future settlement periods.

4. **Resolution Alignment**
   * Elexon `FUELHH` actuals are published at 30-minute settlement period resolution (48 SPs/day).
   * Elexon `WINDFOR` forecasts are published at hourly resolution (24 hours/day).
   * Each hourly forecast is mapped to both `:00` (SP $2k-1$) and `:30` (SP $2k$) half-hour settlement periods. The `/api/forecasts` endpoint returns matched actual and forecast intervals; settlement periods without a matching forecast are excluded from the returned series (not returned with null).

5. **Forecast Accuracy Metrics & Formulas**
   * **Residual Error**: $e_i = \text{Forecast}_i - \text{Actual}_i$ (MW)
   * **Mean Squared Error (MSE)**: $\text{MSE} = \frac{1}{N} \sum_{i=1}^{N} e_i^2$ ($\text{MW}^2$)
   * **Root Mean Squared Error (RMSE)**: $\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} e_i^2}$ (MW) — measures the square root of the average squared forecast error, penalizing larger errors more heavily than MAE.
   * **Mean Absolute Error (MAE)**: $\text{MAE} = \frac{1}{N} \sum_{i=1}^{N} |e_i|$ (MW)
   * **Directional Bias**: $\text{Bias} = \frac{1}{N} \sum_{i=1}^{N} e_i$ (MW)
   * **Weighted Absolute Percentage Error (WAPE)**: $\text{WAPE} = \frac{\sum |e_i|}{\sum \text{Actual}_i} \times 100\%$ (%)

---

## System Architecture

```
├── backend/
│   ├── app.py              # FastAPI application (4 canonical endpoints)
│   ├── database.py         # SQLite engine (WAL mode, composite indexing)
│   ├── ingestion.py        # Elexon BMRS ingestion (FUELHH & WINDFOR)
│   ├── analytics.py        # Vectorized metrics (MAE, RMSE, WAPE, Bias, P90, Diurnal)
│   ├── models.py           # Pydantic validation schemas
│   ├── test_backend.py     # 10/10 passing unit & integration test suite
│   ├── elexon_data.db      # Primed database (1,536 actuals + 19,856 forecasts)
│   ├── requirements.txt    # Minimal pinned dependencies (FastAPI, Uvicorn, Pydantic, Pytest)
│   └── Dockerfile          # Heroku-compatible backend container definition
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx           # Health badge, delivery dates, 09:20 cutoff, presets
│   │   │   ├── KpiCards.jsx         # 5 metric cards (Actuals, Forecasts, Accuracy, Bias, P90)
│   │   │   ├── ForecastChart.jsx    # Composed Recharts (Actual, Forecast, Residuals)
│   │   │   ├── DiurnalView.jsx      # SP 1–48 diurnal profile & volatility inspection
│   │   │   └── MethodologyNotes.jsx # Data sources, citations, and mathematical formulas
│   │   ├── api.js                   # Client for backend endpoints
│   │   ├── App.jsx                  # Main dashboard layout & state orchestration
│   │   └── index.css                # Dark glassmorphic trading desk theme
│   ├── package.json
│   └── vite.config.js               # Reverse proxy to backend port 8000
├── docker-compose.yml      # Root composition
├── Dockerfile              # Root Docker build definition
└── heroku.yml              # Heroku deployment configuration
```

---

## Canonical API Endpoints

The backend exposes only 4 active read-only endpoints:

| Endpoint | Method | Key Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET /api/forecasts` | GET | `date`, `date_from`, `date_to`, `cutoff_time`, `settlement_period` | Matched day-ahead forecast and actual generation intervals for selected delivery dates. |
| `GET /api/accuracy/summary` | GET | `date_from`, `date_to`, `cutoff_time` | MAE, RMSE, WAPE, Bias, and P90 safety reserve margin. |
| `GET /api/accuracy/diurnal` | GET | `date_from`, `date_to`, `cutoff_time` | Half-hour settlement period breakdown (SPs 1–48) identifying recurring diurnal patterns. |
| `GET /api/health` | GET | - | Liveness and database record count verification. |

---

## Local Development & Setup

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
pytest test_backend.py -v   # Run test suite (10/10 passing)
python3 run.py              # Starts API at http://localhost:8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                 # Starts Vite dev server at http://localhost:5173
```

### 3. Docker
```bash
docker compose up --build
```
The primed SQLite database (`elexon_data.db`) is committed and copied into the container, allowing immediate startup without dynamic re-seeding.

---

## AI Tools Disclosure
As required by assignment guidelines, AI tools (Google Antigravity / Gemini) were utilized for code implementation, architectural design, data exploration, and automated testing.
