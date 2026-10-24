import axiosInstance from './axiosInstance';

class WindService {
  async getForecasts({
    date,
    date_from,
    date_to,
    cutoff_time = '09:20:00',
    settlement_period,
  } = {}) {
    try {
      const params = { cutoff_time };
      if (date) params.date = date;
      if (date_from) params.date_from = date_from;
      if (date_to) params.date_to = date_to;
      if (settlement_period) params.settlement_period = settlement_period;

      return await axiosInstance.get('/api/forecasts', { params });
    } catch (err) {
      console.error('[WindService] getForecasts error:', err);
      throw err;
    }
  }

  async getAccuracySummary({
    date_from = '2026-01-01',
    date_to = '2026-01-31',
    cutoff_time = '09:20:00',
  } = {}) {
    try {
      return await axiosInstance.get('/api/accuracy/summary', {
        params: { date_from, date_to, cutoff_time },
      });
    } catch (err) {
      console.error('[WindService] getAccuracySummary error:', err);
      throw err;
    }
  }

  async getDiurnalAccuracy({
    date_from = '2026-01-01',
    date_to = '2026-01-31',
    cutoff_time = '09:20:00',
  } = {}) {
    try {
      return await axiosInstance.get('/api/accuracy/diurnal', {
        params: { date_from, date_to, cutoff_time },
      });
    } catch (err) {
      console.error('[WindService] getDiurnalAccuracy error:', err);
      throw err;
    }
  }

  async checkHealth() {
    try {
      const res = await axiosInstance.get('/api/forecasts?date=2026-01-01&cutoff_time=09:20:00');
      return { isOnline: true, data: res };
    } catch (err) {
      return { isOnline: false, error: err?.message || 'Server offline' };
    }
  }
}

export const windService = new WindService();
export default windService;
