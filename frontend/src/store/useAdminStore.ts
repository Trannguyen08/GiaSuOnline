import { create } from 'zustand';
import { adminService } from '../services/adminService';

const toArray = (data: any) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

interface AdminState {
  stats: any | null;
  tutors: any[];
  users: any[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchStats: () => Promise<void>;
  fetchTutors: (params?: any) => Promise<void>;
  fetchUsers: (params?: any) => Promise<void>;
  tutorAction: (id: number, action: string, data?: any) => Promise<void>;
  userAction: (id: number, action: string, refreshParams?: any) => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  tutors: [],
  users: [],
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await adminService.fetchDashboardStats();
      set({ stats, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchTutors: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const tutors = await adminService.fetchTutors(params);
      set({ tutors: toArray(tutors), isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchUsers: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const users = await adminService.fetchUsers(params);
      set({ users: toArray(users), isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  tutorAction: async (id, action, data) => {
    try {
      await adminService.performTutorAction(id, action, data);
      // Refresh current list
      get().fetchTutors();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  userAction: async (id, action, refreshParams) => {
    try {
      await adminService.performUserAction(id, action);
      // Refresh current list
      await get().fetchUsers(refreshParams);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  }
}));
