import { apiClient } from './axiosClient';

export const approvalsApi = {
  getMyQueue: () => apiClient.get('/approvals/my-queue'),

  decide: (requestId, payload) =>
    apiClient.post(`/approvals/${requestId}/decide`, payload),

  getRules: () => apiClient.get('/approvals/rules'),

  createRule: (payload) => apiClient.post('/approvals/rules', payload),

  deleteRule: (ruleId) => apiClient.delete(`/approvals/rules/${ruleId}`),
};
