import client from './client';

export const adminApi = {
  // Stats
  getStats: () => client.get('/admin/stats/').then(res => res.data),

  // Tutors
  getTutors: (params?: any) => client.get('/admin/tutors/', { params }).then(res => res.data),
  tutorAction: (id: number, action: string, data?: any) => client.post(`/admin/tutors/${id}/action/`, { action, ...data }).then(res => res.data),

  // Users
  getUsers: (params?: any) => client.get('/admin/users/', { params }).then(res => res.data),
  userAction: (id: number, action: string) => client.post(`/admin/users/${id}/action/`, { action }).then(res => res.data),
};
