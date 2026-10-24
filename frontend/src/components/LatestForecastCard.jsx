import React from 'react';
import { Zap, AlertCircle } from 'lucide-react';
import { formatDateTime, formatDate, getSettlementPeriodTimeWindow } from '../utils/dateUtils';
import { formatMW } from '../utils/metricUtils';

export const LatestForecastCard = ({
  latestForecastItem,
  cutoffTime = '09:20:00',
  deliveryDate = '2026-01-01',
}) => {
  if (!latestForecastItem) {
    return (
      <div className="card-base p-5 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-slate-400" />
          <span>Latest eligible forecast information is not available for this period.</span>
        </div>
      </div>
    );
  }

  const sp = latestForecastItem.settlement_period;
  const timeWindow = getSettlementPeriodTimeWindow(sp);

  return (
    <div className="card-base p-5 border-l-4 border-l-teal-600">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
            <Zap className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Latest Eligible Day-Ahead Forecast</h4>
            <p className="text-xs text-slate-500">
              Elexon WINDFOR publication available prior to decision cut-off ({cutoffTime} UTC)
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 w-fit">
          Valid Decision Input
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
        <div>
          <span className="text-slate-500 block text-[11px]">Forecast Generation</span>
          <span className="text-xl font-extrabold text-slate-900 font-mono mt-0.5 block">
            {formatMW(latestForecastItem.forecast_mw)}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[11px]">Publish Time (UTC)</span>
          <span className="text-xs font-bold text-slate-800 font-mono mt-1 block">
            {formatDateTime(latestForecastItem.publish_time)}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block text-[11px]">Delivery Target</span>
          <span className="text-xs font-bold text-slate-800 mt-1 block">
            {formatDate(latestForecastItem.settlement_date || deliveryDate)} (SP {sp})
          </span>
          <span className="text-[10px] text-slate-500 font-mono">{timeWindow}</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[11px]">Enforced Cut-off Horizon</span>
          <span className="text-xs font-bold text-slate-800 font-mono mt-1 block">
            {cutoffTime}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LatestForecastCard;
