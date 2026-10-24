import React from 'react';
import { Database } from 'lucide-react';

export const DataQualityCard = ({
  dataPoints = 0,
  expectedPoints = 48,
  cutoffTime = '09:20:00',
  dateRangeLabel = 'January 2026',
  isSingleDay = true,
}) => {
  return (
    <div className="card-base p-4 sm:p-5 bg-slate-50/70 border-dashed">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
        <div className="flex items-center space-x-2 text-slate-800">
          <Database className="w-4 h-4 text-teal-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider">
            Data Quality & Market Context
          </h4>
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-slate-600">
          <span className="font-semibold text-teal-700">Source: Elexon</span>
          <span>•</span>
          <span>Timezone: UTC</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 text-xs">
        <div>
          <span className="text-slate-500 block text-[11px]">Data Points Returned</span>
          <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block">
            {dataPoints} {isSingleDay ? `/ ${expectedPoints} SPs` : 'intervals'}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[11px]">Enforced Cutoff</span>
          <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block">
            {cutoffTime} UTC
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[11px]">Active Horizon</span>
          <span className="text-sm font-bold text-slate-800 mt-0.5 block truncate">
            {dateRangeLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DataQualityCard;
