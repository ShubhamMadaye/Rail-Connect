import axios from 'axios';

const getApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    const hn = window.location.hostname;
    if (hn && hn !== 'localhost' && hn !== '127.0.0.1') {
      return `http://${hn}:4000/api`;
    }
  }
  return 'http://localhost:4000/api';
};

const api = axios.create({
  baseURL: getApiBase(),
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// ────── Auth ──────
export const authAPI = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ────── Trains ──────
export const trainsAPI = {
  search: (from: string, to: string, date?: string, type?: string) =>
    api.get('/trains/search', { params: { from, to, date, type } }),
  getAll: (type?: string) => api.get('/trains', { params: { type } }),
  getById: (id: string) => api.get(`/trains/${id}`),
  getStations: () => api.get('/trains/stations/all'),
  getStationsWithRoutes: () => api.get('/trains/stations/routes'),
  getLiveStatus: (trainNumber: string) => api.get(`/trains/live/${trainNumber}`),
  getDelayPrediction: (id: string) => api.get(`/trains/${id}/predict-delay`),
};

// ────── Bookings ──────
export const bookingsAPI = {
  create: (data: any) => api.post('/bookings', data),
  getByPNR: (pnr: string) => api.get(`/bookings/pnr/${pnr}`),
  getById: (id: string) => api.get(`/bookings/${id}`),
  getMy: () => api.get('/bookings/my'),
  cancel: (id: string) => api.delete(`/bookings/${id}`),
  getWaitlistPrediction: (pnr: string) => api.get(`/bookings/pnr/${pnr}/waitlist-prediction`),
  validateTicket: (pnr: string) => api.get(`/bookings/pnr/${pnr}/validate`),
  getSystemConfig: () => api.get('/bookings/system/config'),
};

// ────── Timetable ──────
export const timetableAPI = {
  getAll: (date?: string) => api.get('/timetable', { params: { date } }),
  getDelays: () => api.get('/timetable/delays'),
};

// ────── Food ──────
export const foodAPI = {
  getAllVendors: () => api.get('/food/vendors'),
  getVendorsByStation: (stationCode: string) => api.get(`/food/vendors/station/${stationCode}`),
  getMenu: (vendorId: string) => api.get(`/food/menu/${vendorId}`),
  placeOrder: (data: any) => api.post('/food/order', data),
  getOrder: (id: string) => api.get(`/food/order/${id}`),
  getOrdersForBooking: (bookingId: string) => api.get(`/food/orders/booking/${bookingId}`),
};

// ────── Admin ──────
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getBookings: () => api.get('/admin/bookings'),
  getTrains: () => api.get('/admin/trains'),
  getDelays: () => api.get('/admin/delays'),
  setDelay: (data: { trainId: string; date: string; delayMinutes: number; reason?: string }) =>
    api.post('/admin/delays', data),
  clearDelay: (trainId: string, date: string) => api.delete(`/admin/delays/${trainId}/${date}`),
  toggleTrain: (id: string, isActive: boolean) => api.patch(`/admin/trains/${id}`, { isActive }),
  getRevenueAnalytics: () => api.get('/admin/revenue-analytics'),
};

// ────── Assistant ──────
export const assistantAPI = {
  chat: (message: string) => api.post('/assistant/chat', { message }),
};
