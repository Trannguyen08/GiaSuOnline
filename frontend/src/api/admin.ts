import client from './client';

export const adminApi = {
  // Stats
  getStats: (params?: any) => client.get('/admin/stats/', { params }).then(res => res.data),

  // Courses
  getCourses: (params?: any) => client.get('/admin/courses/', { params }).then(res => res.data),
  courseAction: (id: number, action: string) =>
    client.post(`/admin/courses/${id}/action/`, { action }).then(res => res.data),

  // Finance
  getFinance: (params?: any) => client.get('/admin/finance/', { params }).then(res => res.data),
  financeTutorAction: (id: number, action: string, data?: any) =>
    client.post(`/admin/finance/tutors/${id}/action/`, { action, ...data }).then(res => res.data),

  // Bookings / payments / slots
  getBookings: (params?: any) => client.get('/admin/bookings/', { params }).then(res => res.data),
  bookingAction: (id: number, action: string, data?: any) =>
    client.post(`/admin/bookings/${id}/action/`, { action, ...data }).then(res => res.data),
  getPayments: (params?: any) => client.get('/admin/payments/', { params }).then(res => res.data),
  getSlots: (params?: any) => client.get('/admin/slots/', { params }).then(res => res.data),

  // Quality / risk
  getReviews: (params?: any) => client.get('/admin/reviews/', { params }).then(res => res.data),
  reviewAction: (id: number, action: string, data?: any) =>
    client.post(`/admin/reviews/${id}/action/`, { action, ...data }).then(res => res.data),
  getViolations: (params?: any) => client.get('/admin/violations/', { params }).then(res => res.data),
  createViolation: (data: any) => client.post('/admin/violations/', data).then(res => res.data),
  violationAction: (id: number, action: string, data?: any) =>
    client.post(`/admin/violations/${id}/action/`, { action, ...data }).then(res => res.data),
  getAiReviews: (params?: any) => client.get('/admin/ai-reviews/', { params }).then(res => res.data),
  rerunAiReview: (id: number) => client.post(`/admin/ai-reviews/${id}/rerun/`).then(res => res.data),

  // Reports / settings / notifications
  getReports: (params?: any) => client.get('/admin/reports/', { params }).then(res => res.data),
  getSettings: () => client.get('/admin/settings/').then(res => res.data),
  updateSetting: (key: string, value: string) => client.post(`/admin/settings/${key}/`, { value }).then(res => res.data),
  getNotifications: () => client.get('/admin/notifications/').then(res => res.data),

  // Tutors
  getTutors: (params?: any) => client.get('/admin/tutors/', { params }).then(res => res.data),
  tutorAction: (id: number, action: string, data?: any) => client.post(`/admin/tutors/${id}/action/`, { action, ...data }).then(res => res.data),
  deductTutorCommission: (teachingProfileId: number, data?: any) =>
    client.post(`/tutors/admin/${teachingProfileId}/commission/deduct/`, data || {}).then(res => res.data),

  // Users
  getUsers: (params?: any) => client.get('/admin/users/', { params }).then(res => res.data),
  userAction: (id: number, action: string) => client.post(`/admin/users/${id}/action/`, { action }).then(res => res.data),
};
