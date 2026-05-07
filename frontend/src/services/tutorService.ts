import client from '../api/client';

export const tutorService = {
  getProfile: () => client.get('/tutors/settings/').then(res => res.data),
  updateProfile: (data: any) => client.patch('/tutors/settings/', data).then(res => res.data),
  getSubjects: () => client.get('/tutors/subjects/').then(res => res.data),
};
