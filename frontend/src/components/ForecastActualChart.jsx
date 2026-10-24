import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { BarChart2, Eye, EyeOff } from 'lucide-react';
import { formatDateTime } from '../utils/dateUtils';
import { formatMW, formatBiasMW } from '../utils/metricUtils';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload || {};

  return (
    <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-lg text-xs min-w-[240px] space-y-2">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <span className="font-bold text-slate-800">
          {item.timeLabel} UTC (SP {item.settlement_period})
        </span>
        <span className="text-[10px] text-slate-500 font-mono">{item.settlement_date}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center space-x-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span>Forecast (WINDFOR):</span>
          </span>
          <span className="font-mono font-bold text-blue-700">{formatMW(item.forecast_mw)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center space-x-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span>Actual (FUELHH):</span>
          </span>
          <span className="font-mono font-bold text-emerald-700">{formatMW(item.actual_mw)}</span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-slate-600">Forecast Error (Delta):</span>
          <span
            className={`font-mono font-bold ${
              item.error_mw > 0
                ? 'text-amber-700'
                : item.error_mw < 0
                  ? 'text-sky-700'
                  : 'text-slate-900'
            }`}
          >
            {formatBiasMW(item.error_mw)}
          </span>
        </div>

        {item.publish_time && (
          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Forecast Published: </span>
            <strong className="text-slate-700 font-mono">
              {formatDateTime(item.publish_time)}
            </strong>
          </div>
        )}
      </div>
    </div>
  );
};

export const ForecastActualChart = ({
  series = [],
  title = 'Forecast vs Actual Wind Generation',
  subtitle = 'Half-Hourly Settlement Periods (48 periods)',
  height = 380,
}) => {
  const [showForecast, setShowForecast] = useState(true);
  const [showActual, setShowActual] = useState(true);

  const isMultiDay = series.length > 48;
  const chartData = series.map((item, index) => {
    let timeLabel = `SP ${item.settlement_period}`;
    let tickLabel = timeLabel;

    if (item.start_time) {
      try {
        const d = new Date(item.start_time);
        const timeStr = d.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        });
        timeLabel = timeStr;
        if (isMultiDay) {
          const dateStr = d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            timeZone: 'UTC',
          });
          tickLabel = `${dateStr} ${timeStr}`;
        } else {
          tickLabel = timeStr;
        }
      } catch {
        timeLabel = `SP ${item.settlement_period}`;
        tickLabel = timeLabel;
      }
    }

    const uniqueKey =
      item.start_time || `${item.settlement_date || 'date'}_SP${item.settlement_period || index}`;

    return {
      ...item,
      uniqueKey,
      timeLabel,
      tickLabel,
    };
  });

  return (
    <div className="card-base p-5 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-700" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowForecast(!showForecast)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-sm ${
              showForecast
                ? 'bg-blue-50 text-blue-800 border-blue-300'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
            title="Click to show/hide Forecast (WINDFOR) line"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: showForecast ? '#2563eb' : '#94a3b8' }}
            />
            <span>Forecast (WINDFOR)</span>
            {showForecast ? (
              <Eye className="w-3.5 h-3.5 text-blue-700" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowActual(!showActual)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-sm ${
              showActual
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
            title="Click to show/hide Actual (FUELHH) line"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: showActual ? '#059669' : '#94a3b8' }}
            />
            <span>Actual (FUELHH)</span>
            {showActual ? (
              <Eye className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      <div className="w-full min-h-[380px]" style={{ height: `${height || 380}px` }}>
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs py-12">
            No chart data available for the selected parameters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height || 380}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="uniqueKey"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={isMultiDay ? 40 : 25}
                tickFormatter={(val) => {
                  const found = chartData.find((d) => d.uniqueKey === val);
                  if (!found) return '';
                  if (isMultiDay) {
                    try {
                      const d = new Date(found.start_time);
                      return d.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        timeZone: 'UTC',
                      });
                    } catch {
                      return found.timeLabel;
                    }
                  }
                  return found.timeLabel;
                }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
                unit=" MW"
              />
              <Tooltip content={<CustomTooltip />} />

              {showForecast && (
                <Line
                  type="monotone"
                  dataKey="forecast_mw"
                  name="Forecast"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls={false}
                  activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                />
              )}

              {showActual && (
                <Line
                  type="monotone"
                  dataKey="actual_mw"
                  name="Actual"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls={false}
                  activeDot={{ r: 5, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default ForecastActualChart;
