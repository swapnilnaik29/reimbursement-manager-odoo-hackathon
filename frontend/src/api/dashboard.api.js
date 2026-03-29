import { apiClient } from './axiosClient';

export const dashboardApi = {
  /**
   * Admin / Manager view — fetches all company expenses + own queue.
   * apiClient interceptor already unwraps response.data → { data: [...] }
   * so each call returns { data: [...] } and we access .data
   */
  getAdminStats: async () => {
    const [expensesRes, queueRes] = await Promise.allSettled([
      apiClient.get('/expenses'),
      apiClient.get('/approvals/my-queue'),
    ]);

    const totalExpenses =
      expensesRes.status === 'fulfilled' ? expensesRes.value.data || [] : [];
    const myQueue =
      queueRes.status === 'fulfilled' ? queueRes.value.data || [] : [];

    return { totalExpenses, myQueue };
  },

  /**
   * Employee view — their own submitted expenses.
   */
  getEmployeeStats: async () => {
    const res = await apiClient.get('/expenses/me');
    return { totalExpenses: res.data || [] };
  },
};
