import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Clock } from 'lucide-react';
import { formatMW, formatPercent, formatBiasMW } from '../utils/metricUtils';

const METRIC_CONFIG = {
  mae_mw: {
    label: 'Mean Absolute Error (MAE)',
    unit: 'MW',
    color: '#0d9488',
    formatter: (v) => formatMW(v),
    desc: 'Average magnitude of errors by time of day',
  },
  rmse_mw: {
    label: 'Root Mean Squared Error (RMSE)',
    unit: 'MW',
    color: '#d97706',
    formatter: (v) => formatMW(v),
    desc: 'Penalizes large outlier forecast errors by hour',
  },
  bias_mw: {
    label: 'Forecast Bias (Mean Error)',
    unit: 'MW',
    color: '#4f46e5',
    formatter: (v) => formatBiasMW(v),
    desc: 'Overforecasting (+) vs underforecasting (-) tendency',
  },
  wape_percent: {
    label: 'Weighted Abs % Error (WAPE)',
    unit: '%',
    color: '#059669',
    formatter: (v) => formatPercent(v),
    desc: 'Normalized error percentage relative to generation',
  },
};

const DiurnalTooltip = ({ active, payload, activeConf, metric }) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload || {};

  return (
    <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-lg text-xs space-y-1 min-w-[200px]">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1 font-bold text-slate-800">
        <span>SP {item.settlement_period}</span>
        <span className="text-[11px] text-slate-500 font-mono">{item.time_label}</span>
      </div>

      <div className="pt-1 flex items-center justify-between">
        <span className="text-slate-600">{activeConf.label}:</span>
        <span className="font-mono font-bold text-slate-900">
          {activeConf.formatter(item[metric])}
        </span>
      </div>
    </div>
  );
};

export const DiurnalChart = ({
  diurnalData = [],
  selectedPeriod,
  onSelectPeriod,
  dateRangeLabel = 'Selected Date Range',
}) => {
  const [metric, setMetric] = useState('mae_mw');
  const activeConf = METRIC_CONFIG[metric] || METRIC_CONFIG.mae_mw;

  return (
    <div className="card-base p-5 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>Error Analysis (Time-of-Day Pattern)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated across <strong className="text-slate-700">{dateRangeLabel}</strong>. Click
            any bar to highlight its settlement period in the details table below.
          </p>
        </div>

        <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs">
          {Object.entries(METRIC_CONFIG).map(([k]) => {
            const isSelected = metric === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setMetric(k)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {k.replace('_mw', '').replace('_percent', '').toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {selectedPeriod && (
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-center justify-between">
          <span>
            Active Settlement Period highlighted: <strong>SP {selectedPeriod}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              if (onSelectPeriod) {
                onSelectPeriod(null);
              }
            }}
            className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 underline"
          >
            Clear Highlight
          </button>
        </div>
      )}

      <div className="w-full flex-1 min-h-[300px]">
        {diurnalData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs py-12">
            No diurnal accuracy data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={diurnalData}
              margin={{ top: 10, right: 10, left: -5, bottom: 5 }}
              onClick={(e) => {
                if (e?.activePayload?.[0]?.payload?.settlement_period) {
                  if (onSelectPeriod) {
                    onSelectPeriod(e.activePayload[0].payload.settlement_period);
                  }
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="settlement_period"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(sp) => `${sp}`}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                unit={activeConf.unit === '%' ? '%' : ' MW'}
                tickFormatter={(val) =>
                  activeConf.unit === '%'
                    ? `${val}%`
                    : val >= 1000
                      ? `${(val / 1000).toFixed(1)}k`
                      : val
                }
              />
              <Tooltip content={<DiurnalTooltip activeConf={activeConf} metric={metric} />} />

              {metric === 'bias_mw' && (
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              )}

              <Bar dataKey={metric} fill={activeConf.color} radius={[3, 3, 0, 0]} cursor="pointer">
                {diurnalData.map((entry) => {
                  const isHighlighted = selectedPeriod === entry.settlement_period;
                  return (
                    <Cell
                      key={`cell-${entry.settlement_period}`}
                      fill={isHighlighted ? '#0f766e' : activeConf.color}
                      stroke={isHighlighted ? '#042f2e' : 'none'}
                      strokeWidth={isHighlighted ? 2 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default DiurnalChart;
