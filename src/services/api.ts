import axios from 'axios';

const BASE_URL = 'https://registration.gdgakgec.org';

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('gdg_admin_api_key');
  if (apiKey) {
    config.headers['x-api-key'] = apiKey;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('gdg_admin_api_key');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const setApiKey = (key: string) => {
  localStorage.setItem('gdg_admin_api_key', key);
};

export const getApiKey = () => localStorage.getItem('gdg_admin_api_key');

export const clearApiKey = () => {
  localStorage.removeItem('gdg_admin_api_key');
};

export const validateApiKey = async (key: string) => {
  const res = await axios.get(`${BASE_URL}/api/v1/admin/users`, {
    headers: { 'x-api-key': key },
  });
  return res.status === 200;
};

export interface Registration {
  id: string;
  name: string;
  email: string;
  phone: string;
  studentNumber: string;
  college: string;
  year: string;
  department: string;
  isPresentDay1: boolean;
  isPresentDay2: boolean;
  registeredAt: string;
  qrCode?: string;
  [key: string]: unknown;
}

export const fetchRegistrations = async (): Promise<Registration[]> => {
  const res = await api.get('/api/v1/admin/users');
  return res.data.data;
};

export const markAttendance = async (studentNumber: string, day: 1 | 2) => {
  const res = await api.post('/api/v1/admin/mark-attendance', { qrData: studentNumber, day });
  return res.data;
};

export const fetchStats = async () => {
  const res = await api.get('/api/v1/admin/stats');
  return res.data;
};

export const fetchBlockedIPs = async () => {
  const res = await api.get('/api/v1/admin/blocked-ips');
  return res.data.data;
};

export const blockIP = async (ip: string, reason: string) => {
  const res = await api.post('/api/v1/admin/block-ip', { ipAddress: ip, reason });
  return res.data;
};

export const unblockIP = async (ip: string) => {
  const res = await api.post('/api/v1/admin/unblock-ip', { ipAddress: ip });
  return res.data;
};

export default api;
