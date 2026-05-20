import client from './client';

export const roomsApi = {
  getTutorRooms: () => client.get('/courses/rooms/tutor/').then(r => r.data),
  createTutorRoom: (data: any) => client.post('/courses/rooms/tutor/', data).then(r => r.data),
  getTutorRoom: (id: number | string) => client.get(`/courses/rooms/tutor/${id}/`).then(r => r.data),
  addStudents: (id: number | string, student_ids: number[]) =>
    client.post(`/courses/rooms/tutor/${id}/students/`, { student_ids }).then(r => r.data),
  createSession: (roomId: number | string, data: any) =>
    client.post(`/courses/rooms/tutor/${roomId}/sessions/`, data).then(r => r.data),
  updateSession: (sessionId: number, data: any) =>
    client.patch(`/courses/rooms/tutor/sessions/${sessionId}/`, data).then(r => r.data),
  uploadMaterial: (sessionId: number, data: FormData) =>
    client.post(`/courses/rooms/tutor/sessions/${sessionId}/materials/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  presignMaterial: (sessionId: number, data: any) =>
    client.post(`/courses/rooms/tutor/sessions/${sessionId}/materials/presign/`, data).then(r => r.data),
  completeMaterialUpload: (materialId: number) =>
    client.post(`/courses/rooms/tutor/materials/${materialId}/complete/`).then(r => r.data),
  getStudentRooms: () => client.get('/courses/rooms/student/').then(r => r.data),
  getStudentRoom: (id: number | string) => client.get(`/courses/rooms/student/${id}/`).then(r => r.data),
  markRead: (sessionId: number) => client.post(`/courses/rooms/student/sessions/${sessionId}/read/`).then(r => r.data),
};
