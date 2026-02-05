import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API methods
export const apiService = {
  // Auth
  auth: {
    login: async (email: string, password: string) => {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    },
    register: async (userData: {
      name: string;
      email: string;
      password: string;
      role?: string;
      teamId?: string;
    }) => {
      const response = await api.post('/auth/register', userData);
      return response.data;
    },
    getMe: async () => {
      const response = await api.get('/auth/me');
      return response.data;
    },
  },

  // Users
  users: {
    getAll: async () => {
      const response = await api.get('/users');
      return response.data;
    },
    getById: async (id: string) => {
      const response = await api.get(`/users/${id}`);
      return response.data;
    },
    update: async (id: string, userData: {
      name?: string;
      email?: string;
      role?: string;
      teamId?: string;
      isActive?: boolean;
    }) => {
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    },
    delete: async (id: string) => {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    },
    getTeamMembers: async (teamId: string) => {
      const response = await api.get(`/users/team/${teamId}`);
      return response.data;
    },
    changePassword: async (currentPassword: string, newPassword: string) => {
      const response = await api.put('/users/change-password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    },
  },

  // Leave
  leave: {
    apply: async (leaveData: {
      type: 'leave' | 'wfh';
      fromDate: string;
      toDate: string;
      reason: string;
    }) => {
      const response = await api.post('/leave', leaveData);
      return response.data;
    },
    getMy: async () => {
      const response = await api.get('/leave/my');
      return response.data;
    },
    getPending: async () => {
      const response = await api.get('/leave/pending');
      return response.data;
    },
    approve: async (id: string) => {
      const response = await api.put(`/leave/${id}/approve`);
      return response.data;
    },
    reject: async (id: string) => {
      const response = await api.put(`/leave/${id}/reject`);
      return response.data;
    },
  },

  // Broadcast
  broadcast: {
    send: async (broadcastData: {
      message: string;
      teamId?: string;
      audience?: 'TEAM' | 'ORG';
    }) => {
      const response = await api.post('/broadcast', broadcastData);
      return response.data;
    },
    getAll: async () => {
      const response = await api.get('/broadcast');
      return response.data;
    },
  },

  // Dashboard
  dashboard: {
    getEmployee: async () => {
      const response = await api.get('/dashboard/employee');
      return response.data;
    },
    getManager: async () => {
      const response = await api.get('/dashboard/manager');
      return response.data;
    },
    getHR: async () => {
      const response = await api.get('/dashboard/hr');
      return response.data;
    },
    getSystem: async () => {
      const response = await api.get('/dashboard/system');
      return response.data;
    },
  },
};

export default api;

