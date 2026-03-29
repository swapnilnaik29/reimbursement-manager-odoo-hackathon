import { apiClient } from './axiosClient';

export const companiesApi = {
  getMyCompany: () => apiClient.get('/companies/me'),

  updateCompany: (payload) => apiClient.patch('/companies/me', payload),

  getMembers: () => apiClient.get('/companies/me/members'),

  updateMemberRole: (userId, payload) =>
    apiClient.patch(`/companies/me/members/${userId}/role`, payload),

  inviteMember: (payload) => apiClient.post('/auth/invite', payload),
};
