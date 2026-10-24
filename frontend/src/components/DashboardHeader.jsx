import React from 'react';
import { Wind, RefreshCw, Calendar } from 'lucide-react';

export const DashboardHeader = ({
  selectedPeriodLabel = 'January 2026',
  onRefresh,
  loading = false,
}) => {
  return (
    <header className="bg-white border-b border-slate-200/90 shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Wind Generation Forecast Analytics
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>{selectedPeriodLabel}</span>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
              title="Reload live data for current filters"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
