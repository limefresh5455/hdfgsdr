import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'X-Client-Application': 'UK-Energy-Wind-Forecast-Analytics',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    try {
      config.metadata = { startTime: new Date() };

      if (import.meta.env.DEV) {
        console.log(
          `%c[API Request] %c${config.method?.toUpperCase()} %c${config.baseURL || ''}${config.url}`,
          'color: #0d9488; font-weight: bold;',
          'color: #d97706; font-weight: bold;',
          'color: #64748b;'
        );
      }
      return config;
    } catch (err) {
      console.error('[Request Interceptor Error]:', err);
      return config;
    }
  },
  (error) => {
    console.error('[API Request Error]:', error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    try {
      const duration = response.config?.metadata?.startTime
        ? new Date() - response.config.metadata.startTime
        : null;

      if (import.meta.env.DEV) {
        console.log(
          `%c[API Response ${response.status}] %c${response.config?.url} %c(${duration}ms)`,
          'color: #059669; font-weight: bold;',
          'color: #1e293b;',
          'color: #94a3b8;'
        );
      }
      return response.data;
    } catch (err) {
      console.error('[Response Interceptor Handling Error]:', err);
      return response.data;
    }
  },
  (error) => {
    try {
      let formattedMessage = 'Unable to communicate with the electricity market API.';

      if (error.response?.data?.detail) {
        formattedMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        formattedMessage = error.response.data.message;
      } else if (error.message) {
        formattedMessage = error.message;
      }

      const normalizedError = {
        message: formattedMessage,
        status: error.response?.status || 500,
        code: error.code || 'API_ERROR',
        isNetworkError: !error.response,
        originalError: error,
      };

      console.warn(`[Axios Interceptor Caught Error]: ${formattedMessage}`, normalizedError);
      return Promise.reject(new Error(formattedMessage));
    } catch (fatalCatch) {
      console.error('[Fatal Interceptor Error]:', fatalCatch);
      return Promise.reject(error);
    }
  }
);

export default axiosInstance;
