import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

let isHandling401 = false;

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const isBlobRequest = error.config?.responseType === 'blob';

    if (error.response?.status === 401 && !isBlobRequest && !isHandling401) {
      const hasToken = localStorage.getItem('token');
      if (hasToken) {
        isHandling401 = true;

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('needsPasswordChange');

        window.dispatchEvent(new Event('auth:logout'));

        setTimeout(() => { isHandling401 = false; }, 500);
      }
    }

    return Promise.reject(error);
  }
);

export default API;