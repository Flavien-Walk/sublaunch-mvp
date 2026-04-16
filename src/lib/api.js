import axios from 'axios';

const PROD_API = 'https://sublaunch-mvp.onrender.com';
const DEV_API  = 'http://localhost:5000';

const api = axios.create({
  baseURL: DEV_API, // overridden at request time below
  headers: { 'Content-Type': 'application/json' },
});

// Set correct baseURL + attach JWT at request time (runs in browser, window is defined)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    config.baseURL = isLocal ? DEV_API : PROD_API;

    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
