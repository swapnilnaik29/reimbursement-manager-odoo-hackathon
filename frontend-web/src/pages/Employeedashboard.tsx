import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockStore } from '../store/mockStore';
import type { Expense, ExpenseStatus } from '../types';
import { Receipt, Plus, UploadCloud, LogOut, CheckCircle2, Clock, XCircle, FileText, LayoutDashboard, ChevronRight } from 'lucide-react';

interface CurrencyOption { code: string; name: string }

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft:    { label: 'Draft', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: FileText },
  pending:  { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
};

const CATEGORIES = [
  'Travel', 'Meals', 'Accommodation', 'Office Supplies',
  'Software', 'Training', 'Medical', 'Miscellaneous',
];

const MOCK_OCR_RESULTS = [
  { amount: '120.50', category: 'Travel', description: 'Uber rides to conference', currency: 'USD' },
  { amount: '45.00', category: 'Meals', description: 'Lunch with client', currency: 'USD' },
  { amount: '899.99', category: 'Software', description: 'Annual Adobe Subscription', currency: 'USD' },
  { amount: '350.00', category: 'Accommodation', description: '2 nights at Hilton', currency: 'USD' },
];

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    amount: '',
    currency: 'USD',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const fetchData = () => {
    if (user) {
      setExpenses(mockStore.getExpensesByEmployee(user.id));
    }
  };

  useEffect(() => {
    fetchData();
    // Simulate fetching currencies
    setCurrencies([
      { code: 'USD', name: 'USD' }, { code: 'EUR', name: 'EUR' },
      { code: 'GBP', name: 'GBP' }, { code: 'INR', name: 'INR' },
      { code: 'JPY', name: 'JPY' }, { code: 'AUD', name: 'AUD' }
    ]);
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    
    // Simulate OCR scanning delay
    setTimeout(() => {
      const randomMock = MOCK_OCR_RESULTS[Math.floor(Math.random() * MOCK_OCR_RESULTS.length)];
      setForm(prev => ({ ...prev, ...randomMock }));
      setOcrLoading(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    
    setTimeout(() => {
       const company = mockStore.getCompanyById(user.companyId);
       const companyCurrency = company ? company.currency : 'USD';
       
       mockStore.createExpense({
          id: 'exp_' + Date.now(),
          employeeId: user.id,
          amount: parseFloat(form.amount || '0'),
          currency: form.currency,
          category: form.category,
          description: form.description,
          date: form.date,
       }, companyCurrency);

       setShowForm(false);
       setForm({ amount: '', currency: 'USD', category: '', description: '', date: new Date().toISOString().split('T')[0] });
       setSubmitting(false);
       fetchData();
    }, 800);
  };

  const stats = {
    total: expenses.length,
    approved: expenses.filter(e => e.status === 'approved').length,
    pending: expenses.filter(e => e.status === 'pending').length,
    rejected: expenses.filter(e => e.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
            <Receipt className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 block leading-none">ReimburseFlow</span>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1 block">Employee Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500 font-medium">{user?.email}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-indigo-200">
            {user?.name.charAt(0)}
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <button onClick={logout} className="text-slate-400 hover:text-slate-700 transition" title="Logout">
             <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        
        {/* Welcome & Action */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Expenses</h1>
            <p className="text-slate-500 mt-2 font-medium">Track and submit your reimbursement requests.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-200 hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
          >
            <Plus className="w-5 h-5" /> New Expense
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Submitted', value: stats.total, color: 'text-slate-900' },
            { label: 'In Review', value: stats.pending, color: 'text-amber-600' },
            { label: 'Approved', value: stats.approved, color: 'text-emerald-600' },
            { label: 'Rejected', value: stats.rejected, color: 'text-rose-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{s.label}</p>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Expenses List */}
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
           <LayoutDashboard className="w-5 h-5 text-slate-400" /> Recent Activity
        </h2>
        
        <div className="space-y-4">
          {expenses.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700">No expenses yet</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto">You haven't submitted any reimbursement requests. Click the button above to get started.</p>
            </div>
          ) : [...expenses].reverse().map(exp => {
            const currentStatus = STATUS_CONFIG[exp.status];
            const StatusIcon = currentStatus.icon;

            return (
              <div key={exp.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">
                
                {/* Left: Standard Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-1 rounded inline-block">
                      {exp.category}
                    </span>
                    <span className="text-sm font-bold text-slate-400">{exp.date}</span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 leading-tight mb-2">{exp.description}</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">{exp.amount}</span>
                    <span className="text-sm font-bold text-slate-400 uppercase">{exp.currency}</span>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="hidden md:block w-px bg-slate-100"></div>

                {/* Right: Multi-stage Bar & Status */}
                <div className="flex-1 flex flex-col justify-center">
                   <div className="flex items-center justify-between mb-3">
                     <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approval Progress</span>
                     <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${currentStatus.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {currentStatus.label}
                     </span>
                   </div>

                   {/* Status Step Tracker */}
                   <div className="relative pt-4">
                      {/* Tracking Line */}
                      <div className="absolute top-7 left-3 right-3 h-1 bg-slate-100 rounded-full z-0"></div>
                      
                      <div className="relative z-10 flex justify-between">
                         {/* Draft / Submitted Step */}
                         <div className="flex flex-col items-center gap-2 group relative">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 border-[3px] border-white shadow-sm flex items-center justify-center">
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">Submitted</span>
                         </div>

                         {/* Intermediate Steps mapped from trail */}
                         {exp.approvalSteps.map((step, i) => {
                            let stepColor = 'bg-slate-200';
                            let icon = null;
                            if (step.status === 'approved') {
                               stepColor = 'bg-emerald-500';
                               icon = <CheckCircle2 className="w-3 h-3 text-white" />;
                            } else if (step.status === 'rejected') {
                               stepColor = 'bg-rose-500';
                               icon = <XCircle className="w-3 h-3 text-white" />;
                            } else {
                               stepColor = 'bg-amber-400';
                               icon = <Clock className="w-3 h-3 text-white" />;
                            }

                            return (
                              <div key={i} className="flex flex-col items-center gap-2 relative group w-16">
                                <div className={`w-6 h-6 rounded-full border-[3px] border-white shadow-sm flex items-center justify-center z-10 ${stepColor}`}>
                                  {icon}
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 w-full text-center truncate px-1">{step.approverName}</span>
                                
                                {/* Tooltip */}
                                <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-slate-900 text-white text-[10px] py-1 px-3 rounded shadow-xl whitespace-nowrap font-bold">
                                   {step.status === 'pending' ? 'Awaiting Review' : step.status.toUpperCase()}
                                   <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-solid border-t-slate-900 border-t-4 border-x-transparent border-x-4 border-b-0"></div>
                                </div>
                              </div>
                            );
                         })}

                         {/* Final Step */}
                         <div className="flex flex-col items-center gap-2 relative group">
                            <div className={`w-6 h-6 rounded-full border-[3px] border-white shadow-sm flex items-center justify-center ${exp.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                              {exp.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">Finalized</span>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* --- EXPENSE FORM MODAL --- */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden my-auto">
            
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-xl text-slate-900">New Reimbursement</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Submit your receipt</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 bg-white shadow-sm border border-slate-200 rounded-full p-2 transition-all hover:scale-105">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 bg-white">
              
              {/* Magic OCR Dropzone */}
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleReceiptUpload} />
                <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${ocrLoading ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400'}`}>
                  {ocrLoading ? (
                    <div className="flex flex-col items-center">
                       <svg className="animate-spin h-8 w-8 text-indigo-600 mb-3" fill="none" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                       <p className="font-bold text-indigo-700">Scanning receipt with AI...</p>
                       <p className="text-xs text-indigo-500 mt-1">Extracting amounts and dates</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                       <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                          <UploadCloud className="w-6 h-6" />
                       </div>
                       <p className="font-bold text-slate-700">Click to upload receipt</p>
                       <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">AI will auto-fill the form</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 sm:text-lg">$</span>
                    <input type="number" name="amount" value={form.amount} onChange={handleChange} required placeholder="0.00" step="0.01" className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner" />
                  </div>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Currency</label>
                  <select name="currency" value={form.currency} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer">
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Date incurred</label>
                  <input type="date" name="date" value={form.date} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                  <select name="category" value={form.category} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer">
                    <option value="" disabled>Select</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} required rows={2} placeholder="Brief summary of expense..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none shadow-inner" />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                  Discard
                </button>
                <button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}