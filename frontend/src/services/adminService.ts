import { adminApi } from '../api/admin';

export const adminService = {
  async fetchDashboardStats() {
    try {
      const stats = await adminApi.getStats();
      return stats;
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      throw error;
    }
  },

  async fetchTutors(params?: any) {
    try {
      const tutors = await adminApi.getTutors(params);
      return tutors;
    } catch (error) {
      console.error("Error fetching tutors:", error);
      throw error;
    }
  },

  async performTutorAction(id: number, action: string, data?: any) {
    try {
      return await adminApi.tutorAction(id, action, data);
    } catch (error) {
      console.error(`Error performing ${action} on tutor ${id}:`, error);
      throw error;
    }
  },

  async fetchUsers(params?: any) {
    try {
      return await adminApi.getUsers(params);
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  },

  async performUserAction(id: number, action: string) {
    try {
      return await adminApi.userAction(id, action);
    } catch (error) {
      console.error(`Error performing ${action} on user ${id}:`, error);
      throw error;
    }
  }
};
