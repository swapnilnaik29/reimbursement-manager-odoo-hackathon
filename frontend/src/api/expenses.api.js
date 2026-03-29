import { apiClient } from './axiosClient';

export const expensesApi = {
  getMyExpenses: () => apiClient.get('/expenses/me'),

  getAllExpenses: () => apiClient.get('/expenses'),

  getExpenseById: (id) => apiClient.get(`/expenses/${id}`),

  createManual: (formData) =>
    apiClient.post('/expenses/manual', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  createOcrDraft: (payload) => apiClient.post('/expenses/ocr-draft', payload),

  submitExpense: (id, payload = {}) =>
    apiClient.post(`/expenses/${id}/submit`, payload),

  editExpense: (id, updates) => apiClient.patch(`/expenses/${id}`, updates),

  scanReceipt: (formData) =>
    apiClient.post('/expenses/ocr/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
