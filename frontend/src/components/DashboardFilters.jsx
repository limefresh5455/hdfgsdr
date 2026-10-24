import React, { useState } from 'react';
import { Calendar, Clock, Filter, RotateCcw, AlertCircle } from 'lucide-react';

export const DashboardFilters = ({
  initialFilters = {
    mode: 'single',
    date: '2026-01-01',
    dateFrom: '2026-01-01',
    dateTo: '2026-01-31',
    cutoffTime: '09:20:00',
  },
  onApply,
  onReset,
  loading = false,
}) => {
  const [mode, setMode] = useState(initialFilters.mode);
  const [date, setDate] = useState(initialFilters.date);
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom);
  const [dateTo, setDateTo] = useState(initialFilters.dateTo);
  const [cutoffTime, setCutoffTime] = useState(initialFilters.cutoffTime);
  const [validationError, setValidationError] = useState('');

  const handleApply = (e) => {
    e?.preventDefault();
    setValidationError('');

    if (mode === 'single') {
      if (!date) {
        setValidationError('Please select a valid date in January 2026.');
        return;
      }
      onApply({
        mode,
        date,
        cutoffTime,
      });
    } else {
      if (!dateFrom || !dateTo) {
        setValidationError('Both start and end dates are required.');
        return;
      }
      if (dateFrom > dateTo) {
        setValidationError('From date cannot be later than To date.');
        return;
      }
      onApply({
        mode,
        dateFrom,
        dateTo,
        cutoffTime,
      });
    }
  };

  const handleReset = () => {
    setMode('single');
    setDate('2026-01-01');
    setDateFrom('2026-01-01');
    setDateTo('2026-01-31');
    setCutoffTime('09:20:00');
    setValidationError('');
    onReset();
  };

  return (
    <div className="card-base p-4 sm:p-5">
      <form onSubmit={handleApply} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-teal-600" />
              <span>Analysis Mode:</span>
            </span>
            <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setMode('single');
                  setValidationError('');
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  mode === 'single'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Single Day
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('range');
                  setValidationError('');
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  mode === 'range'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Date Range
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <span>Active:</span>
            <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {mode === 'single' ? date : `${dateFrom} → ${dateTo}`} @ {cutoffTime} UTC
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mode === 'single' ? (
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>Delivery Date (January 2026)</span>
              </label>
              <input
                type="date"
                min="2026-01-01"
                max="2026-01-31"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:border-teal-500 focus:bg-white transition"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>From Date</span>
                </label>
                <input
                  type="date"
                  min="2026-01-01"
                  max="2026-02-01"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:border-teal-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>To Date</span>
                </label>
                <input
                  type="date"
                  min="2026-01-01"
                  max="2026-02-01"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:border-teal-500 focus:bg-white transition"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>Forecast Cutoff</span>
              </span>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Timezone: UTC
              </span>
            </label>
            <input
              type="text"
              value={cutoffTime}
              onChange={(e) => setCutoffTime(e.target.value)}
              placeholder="09:20:00"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 font-mono focus:outline-none focus:border-teal-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-end space-x-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Applying...' : 'Apply Filters'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
              title="Reset to default settings"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {validationError && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{validationError}</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default DashboardFilters;
