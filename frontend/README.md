# WindProcure.UK — Day-Ahead Renewable Generation & Error Analytics

> **Decision Support Portal for UK Energy Utilities**  
> Tailored for Power Procurement & Day-Ahead Trading Teams serving electricity demand with weather-dependent renewable wind power.

---

## 🌟 Executive Summary & Problem Setting

The UK electricity market operates on a **Day-Ahead schedule (D-1)** across **48 half-hour settlement periods (SPs)**. Energy procurement teams must commit power supply contracts before daily gate closure to match anticipated customer demand.

Because wind generation is weather-dependent, procurement teams face two core financial risks:

1. **Under-Procurement (Deficit Risk):** Overestimating wind generation results in shortfall penalties settled through volatile cash-out imbalance prices.
2. **Over-Procurement (Surplus Risk):** Underestimating wind generation leads to unnecessary purchases of costly dispatchable thermal generation.

**WindProcure.UK** provides power traders and procurement managers with an interactive decision portal to evaluate day-ahead wind forecasts against outturn actuals, quantify forecast errors, and determine the optimal P90 procurement reserve buffer without look-ahead bias.

---

## 🚀 Key Features

- **Point-in-Time Cutoff Enforcement:** Strictly filters day-ahead forecasts (`WINDFOR`) published prior to the specified operational cut-off time (default: `09:20:00 UTC`), ensuring realistic trading simulation without future data leakage.
- **Single-Day & Date-Range Modes:** Seamlessly inspect granular 48 half-hour intervals for a single delivery day (default: `01 Jan 2026`) or aggregate trends across multi-day ranges.
- **Interactive Generation Trajectory:** High-contrast Recharts visualization comparing Day-Ahead Forecast (Royal Blue `#2563eb`) against Actual Outturn (Emerald Green `#059669`) with active tracking tooltips and series toggles (`Eye` / `EyeOff`).
- **Latest Eligible Forecast Insight:** Highlights the final valid decision forecast available before the trading cutoff window, detailing delivery target SP and UTC publication timestamp.
- **Diurnal Error Profile (Time-of-Day Pattern):** Aggregates 48 settlement periods to isolate diurnal tendencies across MAE, RMSE, Forecast Bias (Over/Underforecasting), and WAPE. Clicking any bar instantly cross-highlights that settlement period in the details table.
- **Executive Risk & Correlation KPIs:**
  - **MAE (Mean Absolute Error):** Unweighted average magnitude of forecast deviation in MW.
  - **RMSE (Root Mean Squared Error):** Quantifies variance and penalizes large outlier misses.
  - **Forecast Bias:** Average signed error indicating systemic over-forecasting (+) or under-forecasting (-).
  - **WAPE (Weighted Absolute Percentage Error):** Normalized error percentage relative to total volume.
  - **P90 Wind Safety Margin:** 90th percentile buffer required to hedge against forecast shortfalls.
  - **Forecast-to-Actual Correlation:** Linear tracking fidelity between WINDFOR and FUELHH.
- **Granular Settlement Table:** Chronologically ordered half-hourly intervals with date tagging, SP 1–48 filtering, search, and one-click **CSV export**.

---

## 📁 Accurate Project Structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── DashboardFilters.jsx       # Single Day / Range toggle, date pickers, cut-off selector
│   │   ├── DashboardHeader.jsx        # Portal navigation header, active period badge, refresh button
│   │   ├── DataQualityCard.jsx        # Data points count, enforced cutoff, and market metadata
│   │   ├── DiurnalChart.jsx           # 48 Settlement Period diurnal bar chart with metric selector
│   │   ├── ErrorState.jsx             # Clean error boundary and retry banner
│   │   ├── ForecastActualChart.jsx    # Full-width line chart with interactive legend toggles
│   │   ├── LatestForecastCard.jsx     # Point-in-time eligible forecast before cutoff
│   │   ├── LoadingState.jsx           # Loading skeleton & animated spinner
│   │   ├── MetricCard.jsx             # KPI metric display card
│   │   └── SettlementTable.jsx        # 48 SP table with date column, SP dropdown, search & CSV export
│   │
│   ├── pages/
│   │   └── Dashboard.jsx              # Central dashboard page orchestrating state, filters & API calls
│   │
│   ├── services/
│   │   ├── axiosInstance.js           # Axios client configured with interceptors & base URL
│   │   ├── windService.js             # API service for forecasts, accuracy summary & diurnal data
│   │   └── index.js                   # Unified service exports
│   │
│   ├── utils/
│   │   ├── csvUtils.js                # CSV formatting and file download helper
│   │   ├── dateUtils.js               # Elexon settlement periods & UTC date/time helpers
│   │   └── metricUtils.js             # MAE, RMSE, Bias, WAPE, Correlation & MW formatters
│   │
│   ├── App.jsx                        # Minimal application root rendering Dashboard
│   ├── index.css                      # Tailwind styling & card utilities
│   └── main.jsx                       # React 19 root entry point
│
├── .env                               # Environment variables (VITE_API_BASE_URL)
├── index.html                         # HTML entry with SEO metadata and Inter typography
├── package.json                       # Dependencies & execution scripts
├── postcss.config.js                  # PostCSS Tailwind plugins
├── tailwind.config.js                 # Custom styling configuration
└── vite.config.js                     # Vite build configuration
```

---

## 🛠️ Technology Stack

| Technology            | Purpose                                                               |
| :-------------------- | :-------------------------------------------------------------------- |
| **React 19**          | Core UI component model with functional hooks                         |
| **Vite**              | Next-generation frontend build tool and dev server                    |
| **Tailwind CSS**      | Clean, responsive design system and glassmorphism cards               |
| **Recharts**          | Interactive SVG charting for generation trajectories and diurnal bars |
| **Lucide React**      | Consistent, modern iconography                                        |
| **Axios**             | Enterprise HTTP client with request metadata & response interceptors  |
| **OxLint & Prettier** | Zero-warning static analysis and consistent code formatting           |

---

## 🔌 Backend API Integration

The frontend connects to the backend API defined in `.env` via `VITE_API_BASE_URL`.

| Endpoint                | Method | Query Parameters                                                                                                  | Description                                                                                             |
| :---------------------- | :----- | :---------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| `/api/forecasts`        | `GET`  | `date`, `cutoff_time`, `settlement_period` _(Single Day)_<br>`date_from`, `date_to`, `cutoff_time` _(Date Range)_ | Returns half-hourly series with matched `WINDFOR` forecast, `FUELHH` actual outturn, and error metrics. |
| `/api/accuracy/summary` | `GET`  | `date_from`, `date_to`, `cutoff_time`                                                                             | Returns aggregated accuracy KPIs: MAE, RMSE, Bias, WAPE, P90 safety margin, and correlation.            |
| `/api/accuracy/diurnal` | `GET`  | `date_from`, `date_to`, `cutoff_time`                                                                             | Returns 48 settlement-period error breakdown across the selected date range.                            |

---

## ⚡ Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create or verify `.env` in the project root:

```env
VITE_API_BASE_URL=https://undenunciatory-stratous-tandra.ngrok-free.dev
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173/`.

### 4. Code Quality & Linting

```bash
# Check code with OxLint (0 errors, 0 warnings)
npm run lint

# Format code with Prettier
npm run format
```

### 5. Build for Production

```bash
npm run build
```

Production-ready assets will be compiled into the `dist/` directory.

---

## 📄 License

Internal utility analytics dashboard built for UK Renewable Power Procurement & Grid Settlement Analytics. Data provided via Elexon datasets (`WINDFOR` & `FUELHH`).
