import React, { useState, useMemo } from 'react';
import { Search, Download, ArrowUpDown } from 'lucide-react';
import {
  formatDate,
  formatTime,
  formatDateTime,
  getSettlementPeriodTimeWindow,
} from '../utils/dateUtils';
import { formatMW, formatBiasMW } from '../utils/metricUtils';
import { exportSeriesToCSV } from '../utils/csvUtils';

export const SettlementTable = ({
  series = [],
  selectedPeriod = null,
  onSelectPeriod,
  deliveryDate = '2026-01-01',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('start_time');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedSPFilter, setSelectedSPFilter] = useState('');

  const filteredData = useMemo(() => {
    let result = [...series];

    if (selectedSPFilter) {
      result = result.filter((item) => String(item.settlement_period) === String(selectedSPFilter));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.settlement_period?.toString().includes(term) ||
          item.start_time?.toLowerCase().includes(term) ||
          item.settlement_date?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      if (sortField === 'start_time') {
        const timeA =
          a.start_time ||
          `${a.settlement_date || ''}_${String(a.settlement_period).padStart(2, '0')}`;
        const timeB =
          b.start_time ||
          `${b.settlement_date || ''}_${String(b.settlement_period).padStart(2, '0')}`;
        return sortAsc ? timeA.localeCompare(timeB) : timeB.localeCompare(timeA);
      }

      if (sortField === 'settlement_period') {
        const diff = (a.settlement_period || 0) - (b.settlement_period || 0);
        if (diff !== 0) return sortAsc ? diff : -diff;
        const timeA = a.start_time || a.settlement_date || '';
        const timeB = b.start_time || b.settlement_date || '';
        return timeA.localeCompare(timeB);
      }

      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [series, searchTerm, selectedSPFilter, sortField, sortAsc]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'abs_error_mw' || field === 'error_mw' ? false : true);
    }
  };

  const handleExport = () => {
    exportSeriesToCSV(filteredData, `settlement_periods_${deliveryDate}.csv`);
  };

  return (
    <div className="card-base overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>Settlement Period Details</span>
            <span className="text-xs bg-white text-slate-700 font-mono font-semibold px-2.5 py-0.5 rounded-full border border-slate-200 shadow-sm">
              {filteredData.length} Intervals
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Half-hourly outturn generation (FUELHH) vs Day-Ahead forecast (WINDFOR)
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs">
          <select
            value={selectedSPFilter}
            onChange={(e) => setSelectedSPFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-teal-500 shadow-sm"
          >
            <option value="">All SPs (1–48)</option>
            {Array.from({ length: 48 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                SP #{i + 1} ({getSettlementPeriodTimeWindow(i + 1)})
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search date or SP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 transition shadow-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-sm transition"
            title="Export filtered table to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[440px] scrollbar-thin">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 z-10 text-[11px]">
            <tr>
              <th
                onClick={() => handleSort('start_time')}
                className="py-3 px-4 cursor-pointer hover:text-teal-700 transition"
                title="Sort by Delivery Date & Time"
              >
                <div className="flex items-center space-x-1">
                  <span>Date</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('settlement_period')}
                className="py-3 px-4 cursor-pointer hover:text-teal-700 transition"
                title="Sort by Settlement Period Number"
              >
                <div className="flex items-center space-x-1">
                  <span>SP</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Delivery Window (UTC)</th>
              <th
                onClick={() => handleSort('forecast_mw')}
                className="py-3 px-4 cursor-pointer hover:text-blue-700 transition"
              >
                <div className="flex items-center space-x-1 text-blue-700">
                  <span>Forecast (WINDFOR)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('actual_mw')}
                className="py-3 px-4 cursor-pointer hover:text-emerald-700 transition"
              >
                <div className="flex items-center space-x-1 text-emerald-700">
                  <span>Actual (FUELHH)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('error_mw')}
                className="py-3 px-4 cursor-pointer hover:text-teal-700 transition"
              >
                <div className="flex items-center space-x-1">
                  <span>Error (MW)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('abs_error_mw')}
                className="py-3 px-4 cursor-pointer hover:text-teal-700 transition"
              >
                <div className="flex items-center space-x-1">
                  <span>Abs Error</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Forecast Publish Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                  No settlement period data found.
                </td>
              </tr>
            ) : (
              filteredData.map((row) => {
                const isSelected = selectedPeriod === row.settlement_period;
                const timeWindow = getSettlementPeriodTimeWindow(row.settlement_period);

                return (
                  <tr
                    key={row.start_time || `${row.settlement_date}_SP${row.settlement_period}`}
                    onClick={() => onSelectPeriod && onSelectPeriod(row.settlement_period)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-teal-50 border-l-4 border-l-teal-600 font-semibold'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-semibold text-slate-700 font-sans">
                      {row.settlement_date
                        ? formatDate(row.settlement_date)
                        : formatDate(deliveryDate)}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-800">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                        #{row.settlement_period}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 font-sans">
                      {row.start_time ? formatTime(row.start_time) : timeWindow}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-blue-700">
                      {formatMW(row.forecast_mw)}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-emerald-700">
                      {formatMW(row.actual_mw)}
                    </td>
                    <td className="py-2.5 px-4 font-bold">
                      <span
                        className={
                          row.error_mw > 0
                            ? 'text-amber-700'
                            : row.error_mw < 0
                              ? 'text-sky-700'
                              : 'text-slate-700'
                        }
                      >
                        {formatBiasMW(row.error_mw)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">{formatMW(row.abs_error_mw)}</td>
                    <td className="py-2.5 px-4 text-slate-500 font-sans text-[11px]">
                      {row.publish_time ? formatDateTime(row.publish_time) : 'N/A'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettlementTable;
