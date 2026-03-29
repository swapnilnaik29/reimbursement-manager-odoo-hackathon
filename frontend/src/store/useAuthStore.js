import { create } from 'zustand';
import { apiClient } from '../api/axiosClient';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isCheckingAuth: true, // For initial mount checks

  login: async (email, password) => {
    const data = await apiClient.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
    // Fetch full profile to get role and company info
    await get().fetchMe();
  },

  signup: async (payload) => {
    const data = await apiClient.post('/auth/signup', payload);
    localStorage.setItem('token', data.token);
    set({ user: data.user, token: data.token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false, isCheckingAuth: false });
  },

  fetchMe: async () => {
    try {
      const data = await apiClient.get('/auth/me');
      set({ user: data.user, isAuthenticated: true, isCheckingAuth: false });
    } catch (err) {
      // Token invalid or expired
      get().logout();
    }
  }
}));
