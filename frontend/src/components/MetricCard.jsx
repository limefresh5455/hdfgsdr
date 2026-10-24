import React from 'react';

export const MetricCard = ({ title, value, unit, icon: Icon }) => {
  const isUnavailable = value === null || value === undefined || value === 'N/A';

  return (
    <div className="card-base card-hover p-4 sm:p-5 flex flex-col justify-between relative group">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</span>
          {Icon && (
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex items-baseline space-x-1.5 mt-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {isUnavailable ? 'N/A' : value}
          </span>
          {!isUnavailable && unit && (
            <span className="text-xs font-semibold text-slate-500">{unit}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
