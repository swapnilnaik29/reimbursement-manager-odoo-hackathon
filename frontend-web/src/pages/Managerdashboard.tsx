import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import type { Expense } from '../types';

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function ManagerDashboard() {
  const { user, token, logout } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await axios.get<Expense[]>('/api/expenses/team', { headers });
      setExpenses(res.data);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAction = async (action: 'approved' | 'rejected') => {
    if (!selectedExpense) return;
    setActionLoading(true);
    try {
      await axios.post(
        `/api/expenses/${selectedExpense.id}/review`,
        { status: action, comment },
        { headers }
      );
      setSelectedExpense(null);
      setComment('');
      fetchExpenses();
    } catch {
      //
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = filter === 'all' ? expenses : expenses.filter(e => e.status === filter);

  const stats = {
    pending: expenses.filter(e => e.status === 'pending').length,
    approved: expenses.filter(e => e.status === 'approved').length,
    rejected: expenses.filter(e => e.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">ReimburseFlow</span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Manager</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Hi, {user?.name}</span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800 transition">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Awaiting Review', value: stats.pending, color: 'text-yellow-600' },
            { label: 'Approved', value: stats.approved, color: 'text-green-600' },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Team Expenses</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition capitalize ${
                  filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No expenses to show.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Employee</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5 text-gray-900 font-medium">{exp.employeeId}</td>
                    <td className="px-5 py-3.5 text-gray-600">{exp.description}</td>
                    <td className="px-5 py-3.5 text-gray-600">{exp.category}</td>
                    <td className="px-5 py-3.5 text-gray-600">{exp.date}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-gray-900">
                      {exp.convertedAmount.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[exp.status]}`}>
                        {exp.status.charAt(0).toUpperCase() + exp.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {exp.status === 'pending' ? (
                        <button
                          onClick={() => { setSelectedExpense(exp); setComment(''); }}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline transition"
                        >
                          Review
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedExpense(exp)}
                          className="text-xs text-gray-400 hover:text-gray-600 font-medium transition"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Expense Details</h3>
              <button onClick={() => setSelectedExpense(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Detail rows */}
              {[
                { label: 'Description', value: selectedExpense.description },
                { label: 'Category', value: selectedExpense.category },
                { label: 'Date', value: selectedExpense.date },
                { label: 'Original Amount', value: `${selectedExpense.amount} ${selectedExpense.currency}` },
                { label: 'Converted Amount', value: `${selectedExpense.convertedAmount.toFixed(2)}` },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="font-medium text-gray-900">{row.value}</span>
                </div>
              ))}

              {/* Approval trail */}
              {selectedExpense.approvalSteps.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Approval Trail</p>
                  <div className="space-y-2">
                    {selectedExpense.approvalSteps.map((step, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          step.status === 'approved' ? 'bg-green-500' :
                          step.status === 'rejected' ? 'bg-red-500' : 'bg-gray-300'
                        }`} />
                        <span className="text-gray-700">{step.approverName}</span>
                        <span className={`ml-auto text-xs ${
                          step.status === 'approved' ? 'text-green-600' :
                          step.status === 'rejected' ? 'text-red-600' : 'text-gray-400'
                        }`}>{step.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comment + actions only for pending */}
              {selectedExpense.status === 'pending' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Comment (optional)</label>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      rows={3}
                      placeholder="Add a comment..."
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => handleAction('rejected')}
                      disabled={actionLoading}
                      className="flex-1 border border-red-300 text-red-600 font-medium py-2.5 rounded-lg text-sm hover:bg-red-50 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction('approved')}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2.5 rounded-lg text-sm transition"
                    >
                      {actionLoading ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}