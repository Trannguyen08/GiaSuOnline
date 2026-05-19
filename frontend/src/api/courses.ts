import client from './client';

export const coursesApi = {
  // Student
  getStudentCourses: () => client.get('/courses/student/').then(r => r.data),
  getStudentCourseDetail: (id: number) => client.get(`/courses/student/${id}/`).then(r => r.data),
  completeSession: (sessionId: number) => client.post(`/courses/sessions/${sessionId}/complete/`).then(r => r.data),
  reviewCourse: (id: number, data: any) => client.post(`/courses/student/${id}/review/`, data).then(r => r.data),
  requestExtension: (id: number, data: any) => client.post(`/courses/student/${id}/extend/`, data).then(r => r.data),

  // Tutor
  getTutorCourses: () => client.get('/courses/tutor/').then(r => r.data),
  getTutorReviews: () => client.get('/courses/tutor/reviews/').then(r => r.data),
  getTutorExtensionRequests: () => client.get('/courses/tutor/extensions/').then(r => r.data),
  decideExtensionRequest: (id: number, data: any) => client.post(`/courses/tutor/extensions/${id}/decision/`, data).then(r => r.data),
  getTutorCourseDetail: (id: number) => client.get(`/courses/tutor/${id}/`).then(r => r.data),
  updateSession: (sessionId: number, data: any) => client.patch(`/courses/tutor/sessions/${sessionId}/update/`, data).then(r => r.data),
  uploadMaterial: (sessionId: number, data: FormData) =>
    client.post(`/courses/tutor/sessions/${sessionId}/materials/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data),
  presignMaterial: (sessionId: number, data: any) =>
    client.post(`/courses/tutor/sessions/${sessionId}/materials/presign/`, data).then(r => r.data),
  completeMaterialUpload: (materialId: number) =>
    client.post(`/courses/tutor/materials/${materialId}/complete/`).then(r => r.data),
  deleteMaterial: (sessionId: number, materialId: number) =>
    client.delete(`/courses/tutor/sessions/${sessionId}/materials/?material_id=${materialId}`),
};
