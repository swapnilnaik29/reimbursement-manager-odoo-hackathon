import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import type { Expense } from '../types';

interface CurrencyOption {
  code: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const CATEGORIES = [
  'Travel', 'Meals', 'Accommodation', 'Office Supplies',
  'Software', 'Training', 'Medical', 'Miscellaneous',
];

export default function EmployeeDashboard() {
  const { user, token, logout } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    amount: '',
    currency: 'USD',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    receiptUrl: '',
  });

  const headers = { Authorization: `Bearer ${token}` };

  // Load expenses
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await axios.get<Expense[]>('/api/expenses/my', { headers });
      setExpenses(res.data);
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  };

  // Load currencies from exchange rate API
  useEffect(() => {
    fetchExpenses();
    axios.get<{ rates: Record<string, number> }>(
      'https://api.exchangerate-api.com/v4/latest/USD'
    ).then(res => {
      const list = Object.keys(res.data.rates).map(code => ({ code, name: code }));
      setCurrencies(list);
    }).catch(() => {
      setCurrencies([{ code: 'USD', name: 'USD' }, { code: 'INR', name: 'INR' }, { code: 'EUR', name: 'EUR' }]);
    });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // OCR: upload receipt image and auto-fill form
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const data = new FormData();
      data.append('receipt', file);
      const res = await axios.post<{
        amount: string;
        currency: string;
        category: string;
        description: string;
        date: string;
      }>('/api/ocr/receipt', data, { headers });
      setForm(prev => ({ ...prev, ...res.data }));
    } catch {
      // OCR failed, user fills manually
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/api/expenses', form, { headers });
      setShowForm(false);
      setForm({
        amount: '', currency: 'USD', category: '',
        description: '', date: new Date().toISOString().split('T')[0], receiptUrl: '',
      });
      fetchExpenses();
    } catch {
      // show error
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: expenses.length,
    approved: expenses.filter(e => e.status === 'approved').length,
    pending: expenses.filter(e => e.status === 'pending').length,
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
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Employee</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Hi, {user?.name}</span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800 transition">Logout</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
            { label: 'Approved', value: stats.approved, color: 'text-green-600' },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Header + Submit button */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">My Expenses</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <span>+</span> New Expense
          </button>
        </div>

        {/* Expense table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No expenses yet. Submit your first one!</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Category</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Approvals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5 text-gray-600">{exp.date}</td>
                    <td className="px-5 py-3.5 text-gray-900 font-medium">{exp.description}</td>
                    <td className="px-5 py-3.5 text-gray-600">{exp.category}</td>
                    <td className="px-5 py-3.5 text-right text-gray-900 font-medium">
                      {exp.amount} {exp.currency}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[exp.status]}`}>
                        {exp.status.charAt(0).toUpperCase() + exp.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1">
                        {exp.approvalSteps.map((step, i) => (
                          <div
                            key={i}
                            title={`${step.approverName}: ${step.status}`}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              step.status === 'approved' ? 'bg-green-100 text-green-700' :
                              step.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {step.approverName[0]}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Expense Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Submit Expense</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* OCR Upload */}
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 rounded-xl p-5 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition"
              >
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleReceiptUpload} />
                {ocrLoading ? (
                  <p className="text-sm text-indigo-600">Scanning receipt...</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700">Upload receipt for auto-fill</p>
                    <p className="text-xs text-gray-400 mt-1">OCR will auto-fill the form below</p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Amount</label>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Currency</label>
                  <select
                    name="currency"
                    value={form.currency}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    {currencies.map(c => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                  rows={3}
                  placeholder="What was this expense for?"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 rounded-lg text-sm transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}