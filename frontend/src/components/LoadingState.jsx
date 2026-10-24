import React from 'react';

export const LoadingState = ({ message = 'Loading electricity market forecast data...' }) => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-base p-5 h-28 flex flex-col justify-between">
            <div className="h-3.5 bg-slate-200 rounded w-1/3" />
            <div className="h-7 bg-slate-200 rounded w-1/2" />
            <div className="h-3 bg-slate-100 rounded w-1/4" />
          </div>
        ))}
      </div>

      <div className="card-base p-5 h-96 flex flex-col justify-between">
        <div className="h-4 bg-slate-200 rounded w-1/4" />
        <div className="h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">
          {message}
        </div>
        <div className="h-3 bg-slate-200 rounded w-1/3" />
      </div>

      <div className="card-base p-5 h-64 flex flex-col justify-between">
        <div className="h-4 bg-slate-200 rounded w-1/5" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((r) => (
            <div key={r} className="h-8 bg-slate-100 rounded-lg w-full" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoadingState;
