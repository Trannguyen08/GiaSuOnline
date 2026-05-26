import client from '../api/client';

export const tutorService = {
  getDashboard: () => client.get('/tutors/dashboard/').then(res => res.data),
  getProfile: () => client.get('/tutors/settings/').then(res => res.data),
  updateProfile: (data: any) => client.patch('/tutors/settings/', data).then(res => res.data),
  getSubjects: () => client.get('/tutors/subjects/').then(res => res.data),
  getGuaranteeStatus: () => client.get('/tutors/guarantee/').then(res => res.data),
  topUpGuaranteeDeposit: (data: { amount: string; note?: string }) =>
    client.post('/tutors/guarantee/deposit/', data).then(res => res.data),
  payCommission: (data: { amount: string; note?: string }) =>
    client.post('/tutors/guarantee/commission/pay/', data).then(res => res.data),
  getPayoutRequests: () => client.get('/tutors/payout-requests/').then(res => res.data),
  createPayoutRequest: (data: any) =>
    client.post('/tutors/payout-requests/', data).then(res => res.data),
};
