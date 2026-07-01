import client, { publicClient } from './client';

export const bookingsApi = {
  getTutorSlots: () => client.get('/bookings/tutor/slots/').then(r => r.data),
  createTutorSlot: (data: any) => client.post('/bookings/tutor/slots/', data).then(r => r.data),
  updateTutorSlot: (id: number, data: any) => client.patch(`/bookings/tutor/slots/${id}/`, data).then(r => r.data),
  deleteTutorSlot: (id: number) => client.delete(`/bookings/tutor/slots/${id}/`),
  getTutorBookings: () => client.get('/bookings/tutor/bookings/').then(r => r.data),
  decideTutorBooking: (id: number, data: any) => client.post(`/bookings/tutor/bookings/${id}/decision/`, data).then(r => r.data),
  getTutorStudents: () => client.get('/bookings/tutor/students/').then(r => r.data),
  getPublicTutorSlots: (tutorId: number | string) => publicClient.get(`/bookings/public/tutors/${tutorId}/slots/`).then(r => r.data),
  bookSlot: (slotId: number, data: any = {}) => client.post(`/bookings/student/slots/${slotId}/book/`, data).then(r => r.data),
  createBooking: (tutorId: number | string, data: any = {}) => client.post(`/bookings/student/tutors/${tutorId}/book/`, data).then(r => r.data),
  getStudentBookings: () => client.get('/bookings/student/bookings/').then(r => r.data),
  cancelStudentBooking: (id: number, data: any) => client.post(`/bookings/student/bookings/${id}/cancel/`, data).then(r => r.data),
  createDepositPayment: (bookingId: number) => client.post(`/bookings/student/bookings/${bookingId}/deposit/`).then(r => r.data),
  verifyPayment: (data: any) => client.post('/bookings/student/payments/verify/', data).then(r => r.data),
  getPolicies: () => client.get('/bookings/policies/').then(r => r.data),
  getSupportCases: () => client.get('/bookings/support/cases/').then(r => r.data),
  createSupportCase: (data: any) => client.post('/bookings/support/cases/', data).then(r => r.data),
  disputeTutorReview: (id: number, data: any) => client.post(`/bookings/tutor/reviews/${id}/dispute/`, data).then(r => r.data),
};
