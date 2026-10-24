export const exportSeriesToCSV = (series = [], filename = 'wind_forecast_vs_actual.csv') => {
  try {
    if (!series || series.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = [
      'Settlement Date',
      'Settlement Period',
      'Start Time (UTC)',
      'Forecast MW',
      'Actual MW',
      'Error MW',
      'Abs Error MW',
      'Forecast Publish Time (UTC)',
    ];

    const rows = series.map((item) => [
      item.settlement_date || '',
      item.settlement_period || '',
      item.start_time || '',
      item.forecast_mw ?? '',
      item.actual_mw ?? '',
      item.error_mw ?? '',
      item.abs_error_mw ?? '',
      item.publish_time || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('CSV export failed:', err);
    alert('Failed to generate CSV export.');
  }
};
