import { create } from 'zustand';
import { adminService } from '../services/adminService';

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
  userAction: (id: number, action: string) => Promise<void>;
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
      set({ tutors, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchUsers: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const users = await adminService.fetchUsers(params);
      set({ users, isLoading: false });
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
    }
  },

  userAction: async (id, action) => {
    try {
      await adminService.performUserAction(id, action);
      // Refresh current list
      get().fetchUsers();
    } catch (error: any) {
      set({ error: error.message });
    }
  }
}));
