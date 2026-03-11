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
// Calendar
calendar: {
  getMonth: async (year: number, month: number) => {
    const response = await api.get(`/calendar/month?year=${year}&month=${month}`);
    return response.data;
  },
},
  // Chat
  chat: {
    getConversations: async () => {
      const response = await api.get('/chat/conversations');
      return response.data;
    },
    getUsers: async () => {
      const response = await api.get('/chat/users');
      return response.data;
    },
    getMessages: async (conversationId: string) => {
      const response = await api.get(`/chat/messages/${conversationId}`);
      return response.data;
    },
    searchMessages: async (conversationId: string, query: string, limit = 30) => {
      const response = await api.get(`/chat/messages/${conversationId}/search`, {
        params: { q: query, limit },
      });
      return response.data;
    },
    getConversationParticipants: async (conversationId: string) => {
      const response = await api.get(`/chat/conversation/${conversationId}/participants`);
      return response.data;
    },
    getPinnedMessages: async (conversationId: string) => {
      const response = await api.get(`/chat/conversation/${conversationId}/pinned`);
      return response.data;
    },
    addGroupMembers: async (conversationId: string, participantIds: string[]) => {
      const response = await api.post(`/chat/conversation/${conversationId}/members`, { participantIds });
      return response.data;
    },
    removeGroupMember: async (conversationId: string, userId: string) => {
      const response = await api.delete(`/chat/conversation/${conversationId}/members/${userId}`);
      return response.data;
    },
    leaveGroup: async (conversationId: string) => {
      const response = await api.post(`/chat/conversation/${conversationId}/leave`);
      return response.data;
    },
    renameGroup: async (conversationId: string, name: string) => {
      const response = await api.put(`/chat/conversation/${conversationId}/name`, { name });
      return response.data;
    },
    lockConversation: async (conversationId: string) => {
      const response = await api.put(`/chat/conversation/${conversationId}/lock`);
      return response.data;
    },
    unlockConversation: async (conversationId: string) => {
      const response = await api.put(`/chat/conversation/${conversationId}/unlock`);
      return response.data;
    },
    getUnreadSummary: async () => {
      const response = await api.get('/chat/notifications/unread');
      return response.data;
    },
    getMentionNotifications: async (limit = 20) => {
      const response = await api.get('/chat/notifications/mentions', { params: { limit } });
      return response.data;
    },
    markConversationRead: async (conversationId: string) => {
      const response = await api.post(`/chat/messages/${conversationId}/read`);
      return response.data;
    },
    createConversation: async (conversationData: {
      type: 'direct' | 'group' | 'announcement';
      participants: string[];
      name?: string;
      department?: string;
    }) => {
      const response = await api.post('/chat/conversation', conversationData);
      return response.data;
    },
    sendMessage: async (messageData: {
      conversationId: string;
      content: string;
      mentions?: string[];
      replyTo?: string | null;
    }) => {
      const response = await api.post('/chat/message', messageData);
      return response.data;
    },
    editMessage: async (messageId: string, payload: { content: string; mentions?: string[] }) => {
      const response = await api.put(`/chat/message/${messageId}`, payload);
      return response.data;
    },
    deleteMessage: async (messageId: string, scope: 'me' | 'everyone' = 'me') => {
      const response = await api.delete(`/chat/message/${messageId}`, { data: { scope } });
      return response.data;
    },
    replyToMessage: async (messageId: string, payload: { content: string; mentions?: string[] }) => {
      const response = await api.post(`/chat/message/${messageId}/reply`, payload);
      return response.data;
    },
    reactToMessage: async (messageId: string, emoji: string) => {
      const response = await api.post(`/chat/message/${messageId}/reaction`, { emoji });
      return response.data;
    },
    pinMessage: async (messageId: string) => {
      const response = await api.post(`/chat/message/${messageId}/pin`);
      return response.data;
    },
    unpinMessage: async (messageId: string) => {
      const response = await api.delete(`/chat/message/${messageId}/pin`);
      return response.data;
    },
  },

  // Attendance
  attendance: {
    getToday: async () => {
      const response = await api.get('/attendance/today');
      return response.data;
    },
    checkIn: async () => {
      const response = await api.post('/attendance/check-in');
      return response.data;
    },
    checkOut: async () => {
      const response = await api.post('/attendance/check-out');
      return response.data;
    },
    getHistory: async (params?: { startDate?: string; endDate?: string; limit?: number }) => {
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      const queryString = queryParams.toString();
      const response = await api.get(`/attendance/history${queryString ? `?${queryString}` : ''}`);
      return response.data;
    },
    updateActivity: async () => {
      const response = await api.put('/attendance/activity');
      return response.data;
    },
  },
};

export default api;
