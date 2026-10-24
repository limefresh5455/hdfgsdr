import React, { useState, useEffect } from 'react';
import { windService } from '../services';
import DashboardHeader from '../components/DashboardHeader';
import DashboardFilters from '../components/DashboardFilters';
import MetricCard from '../components/MetricCard';
import ForecastActualChart from '../components/ForecastActualChart';
import LatestForecastCard from '../components/LatestForecastCard';
import SettlementTable from '../components/SettlementTable';
import DiurnalChart from '../components/DiurnalChart';
import DataQualityCard from '../components/DataQualityCard';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import { formatDate } from '../utils/dateUtils';
import { formatMW, formatBiasMW, formatCorrelation } from '../utils/metricUtils';
import { TrendingUp, ShieldAlert, Award } from 'lucide-react';

export const Dashboard = () => {
  const [filters, setFilters] = useState({
    mode: 'single',
    date: '2026-01-01',
    dateFrom: '2026-01-01',
    dateTo: '2026-01-31',
    cutoffTime: '09:20:00',
  });

  const [forecastsData, setForecastsData] = useState(null);
  const [accuracySummary, setAccuracySummary] = useState(null);
  const [diurnalData, setDiurnalData] = useState([]);
  const [selectedSettlementPeriod, setSelectedSettlementPeriod] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      try {
        const cutoff = filters.cutoffTime || '09:20:00';
        const isSingle = filters.mode === 'single';

        const forecastParams = isSingle
          ? { date: filters.date, cutoff_time: cutoff }
          : { date_from: filters.dateFrom, date_to: filters.dateTo, cutoff_time: cutoff };

        const summaryParams = isSingle
          ? { date_from: filters.date, date_to: filters.date, cutoff_time: cutoff }
          : { date_from: filters.dateFrom, date_to: filters.dateTo, cutoff_time: cutoff };

        const diurnalParams = isSingle
          ? { date_from: filters.date, date_to: filters.date, cutoff_time: cutoff }
          : { date_from: filters.dateFrom, date_to: filters.dateTo, cutoff_time: cutoff };

        const [forecastResult, summaryResult, diurnalResult] = await Promise.allSettled([
          windService.getForecasts(forecastParams),
          windService.getAccuracySummary(summaryParams),
          windService.getDiurnalAccuracy(diurnalParams),
        ]);

        if (ignore) return;

        let hasSuccess = false;

        if (forecastResult.status === 'fulfilled') {
          setForecastsData(forecastResult.value);
          hasSuccess = true;
        } else {
          console.warn('Forecasts endpoint error:', forecastResult.reason);
        }

        if (summaryResult.status === 'fulfilled') {
          setAccuracySummary(summaryResult.value);
          hasSuccess = true;
        } else {
          console.warn('Summary endpoint error:', summaryResult.reason);
        }

        if (diurnalResult.status === 'fulfilled') {
          setDiurnalData(Array.isArray(diurnalResult.value) ? diurnalResult.value : []);
          hasSuccess = true;
        } else {
          console.warn('Diurnal endpoint error:', diurnalResult.reason);
        }

        if (!hasSuccess) {
          throw new Error(
            forecastResult.reason?.message ||
              'Failed to retrieve data from all endpoints. Please verify network access.'
          );
        }

        setError(null);
        setLastUpdated(new Date().toLocaleTimeString('en-GB') + ' UTC');
      } catch (err) {
        if (!ignore) {
          console.error('Dashboard load failure:', err);
          setError(err?.message || 'Failed to connect to the electricity market backend API.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, [filters, refreshCounter]);

  const handleApplyFilters = (newFilters) => {
    setLoading(true);
    setError(null);
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setLoading(true);
    setError(null);
    const defaults = {
      mode: 'single',
      date: '2026-01-01',
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      cutoffTime: '09:20:00',
    };
    setFilters(defaults);
    setSelectedSettlementPeriod(null);
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setRefreshCounter((prev) => prev + 1);
  };

  const periodLabel =
    filters.mode === 'single'
      ? formatDate(filters.date)
      : `${formatDate(filters.dateFrom)} → ${formatDate(filters.dateTo)}`;

  const activeMetrics =
    filters.mode === 'single'
      ? forecastsData?.summary || accuracySummary || {}
      : accuracySummary || forecastsData?.summary || {};

  const seriesList = forecastsData?.series || [];
  const latestEligibleForecast = seriesList.length > 0 ? seriesList[seriesList.length - 1] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-500/20 selection:text-teal-900">
      <DashboardHeader
        selectedPeriodLabel={periodLabel}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        loading={loading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <DashboardFilters
          initialFilters={filters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          loading={loading}
        />

        {error && !loading && (
          <ErrorState title="API Communication Error" message={error} onRetry={handleRefresh} />
        )}

        {loading && <LoadingState message="Fetching live Elexon January 2026 datasets..." />}

        {!loading && (forecastsData || accuracySummary) && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="MAE (Mean Absolute Error)"
                value={
                  activeMetrics.mae_mw !== undefined
                    ? Number(activeMetrics.mae_mw).toLocaleString('en-GB', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })
                    : 'N/A'
                }
                unit="MW"
              />

              <MetricCard
                title="RMSE (Root Mean Squared Error)"
                value={
                  activeMetrics.rmse_mw !== undefined
                    ? Number(activeMetrics.rmse_mw).toLocaleString('en-GB', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })
                    : 'N/A'
                }
                unit="MW"
              />

              <MetricCard
                title="WAPE (Weighted Abs % Error)"
                value={
                  activeMetrics.wape_percent !== undefined
                    ? Number(activeMetrics.wape_percent).toFixed(2)
                    : 'N/A'
                }
                unit="%"
              />

              <MetricCard
                title="Forecast Bias (Mean Error)"
                value={
                  activeMetrics.bias_mw !== undefined ? formatBiasMW(activeMetrics.bias_mw) : 'N/A'
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="card-base p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    P90 Wind Safety Margin
                  </span>
                  <div className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">
                    {formatMW(activeMetrics.p90_safety_margin_mw || activeMetrics.p90_error_mw)}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Procurement reserve required to cover 90% of forecast shortfalls
                  </p>
                </div>
                <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>

              <div className="card-base p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Forecast-to-Actual Correlation
                  </span>
                  <div className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">
                    {formatCorrelation(activeMetrics.correlation)}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Linear tracking correlation between WINDFOR and FUELHH
                  </p>
                </div>
                <div className="p-2 bg-teal-50 rounded-xl text-teal-700">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="card-base p-4 flex items-center justify-between sm:col-span-2 lg:col-span-1">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Mean Generation (Actual vs Forecast)
                  </span>
                  <div className="text-sm font-extrabold font-mono text-slate-800 mt-0.5">
                    {formatMW(activeMetrics.mean_actual_mw)} /{' '}
                    {formatMW(activeMetrics.mean_forecast_mw)}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Actual average output vs day-ahead anticipated capacity
                  </p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
                  <Award className="w-5 h-5" />
                </div>
              </div>
            </div>

            <ForecastActualChart
              series={seriesList}
              title={`Forecast vs Actual Generation (${periodLabel})`}
              subtitle={`Half-hourly power profile with enforce cutoff: ${filters.cutoffTime} UTC`}
            />

            <LatestForecastCard
              latestForecastItem={latestEligibleForecast}
              cutoffTime={filters.cutoffTime}
              deliveryDate={filters.date}
            />

            <DiurnalChart
              diurnalData={diurnalData}
              selectedPeriod={selectedSettlementPeriod}
              onSelectPeriod={setSelectedSettlementPeriod}
              dateRangeLabel={periodLabel}
            />

            <SettlementTable
              series={seriesList}
              selectedPeriod={selectedSettlementPeriod}
              onSelectPeriod={setSelectedSettlementPeriod}
              deliveryDate={filters.date}
            />

            <DataQualityCard
              dataPoints={forecastsData?.data_points || seriesList.length}
              expectedPoints={48}
              cutoffTime={filters.cutoffTime}
              dateRangeLabel={periodLabel}
              isSingleDay={filters.mode === 'single'}
            />
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-bold text-slate-700">Wind Generation Forecast Analytics</span> —
            UK National Wind Generation Decision Support Portal
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-500">
            <span>Data: Elexon BMRS (FUELHH & WINDFOR)</span>
            <span>•</span>
            <span>Target Period: January 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
