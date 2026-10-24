import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const ErrorState = ({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while communicating with the backend API.',
  onRetry,
}) => {
  return (
    <div className="card-base p-8 text-center bg-rose-50/50 border-rose-200 space-y-4 max-w-xl mx-auto my-6">
      <div className="w-12 h-12 bg-rose-100 rounded-2xl mx-auto flex items-center justify-center text-rose-600 shadow-sm">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">{message}</p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;
