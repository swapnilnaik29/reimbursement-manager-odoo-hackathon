import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockStore } from '../store/mockStore';
import type { Expense } from '../types';
import { ClipboardCheck, CheckCircle2, XCircle, Clock, LogOut, Receipt, User } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:  { label: 'Pending Review', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
};

export default function ManagerDashboard() {
  const { user, logout } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'resolved'>('pending');

  const fetchData = () => {
    if (user) {
      // In a real app we'd fetch all historical too, but here we'll pull pending reviews from store
      // We will also just pull ALL expenses and filter them loosely for the "resolved" tab mock
      const allExpensesForManager = mockStore.getExpensesForManagerReview(user.id);
      
      // Let's also fetch expenses that this manager ever reviewed
      const allExpenses = mockStore.getExpenses();
      const reviewedExpenses = allExpenses.filter(e => 
        e.approvalSteps.some(s => s.approverId === user.id && s.status !== 'pending')
      );

      const combined = Array.from(new Set([...allExpensesForManager, ...reviewedExpenses]));
      setExpenses(combined);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAction = (action: 'approved' | 'rejected') => {
    if (!selectedExpense || !user) return;
    setActionLoading(true);
    
    // Simulate processing
    setTimeout(() => {
      mockStore.reviewExpenseStep(selectedExpense.id, user.id, action, comment);
      setSelectedExpense(null);
      setComment('');
      setActionLoading(false);
      fetchData();
    }, 600);
  };

  // derived lists
  const pendingReviews = expenses.filter(e => e.approvalSteps.some(s => s.approverId === user?.id && s.status === 'pending'));
  const resolvedReviews = expenses.filter(e => e.approvalSteps.some(s => s.approverId === user?.id && s.status !== 'pending'));
  const displayList = filter === 'pending' ? pendingReviews : resolvedReviews;

  const stats = {
    pending: pendingReviews.length,
    resolved: resolvedReviews.length,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">

      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-purple-200">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 block leading-none">ReimburseFlow</span>
            <span className="text-xs font-bold text-purple-600 uppercase tracking-widest mt-1 block">Manager Review</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500 font-medium">{user?.email}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold border-2 border-purple-200">
            {user?.name.charAt(0)}
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-slate-700 transition" title="Logout">
             <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Team Approvals</h1>
          <p className="text-slate-500 mt-2 font-medium">Review and process expense requests from your team or cross-department workflows.</p>
        </div>

        {/* Stats & Filters */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          
          <div className="flex gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm min-w-[200px]">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Awaiting Action</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-amber-500">{stats.pending}</p>
                <p className="text-sm font-bold text-slate-500">requests</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm min-w-[200px]">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resolved by you</p>
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-slate-800">{stats.resolved}</p>
                <p className="text-sm font-bold text-slate-500">requests</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-200/50 p-1.5 rounded-xl inline-flex self-start md:self-end border border-slate-200">
            <button
              onClick={() => setFilter('pending')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${filter === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Needs Review
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${filter === 'resolved' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Previously Reviewed
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {displayList.length === 0 ? (
            <div className="p-16 text-center">
              <ClipboardCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700">All caught up!</h3>
              <p className="text-slate-500 mt-2">You have no {filter === 'pending' ? 'pending approvals' : 'past reviews'} to display.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Request Owner</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-right">Amount (Company Cur.)</th>
                    <th className="px-6 py-4">Overall Status</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayList.map(exp => {
                    const owner = mockStore.getUserById(exp.employeeId);
                    const isPendingAction = exp.approvalSteps.some(s => s.approverId === user?.id && s.status === 'pending');
                    const globalStatus = STATUS_CONFIG[exp.status] || STATUS_CONFIG['pending'];
                    const GlobalIcon = globalStatus.icon;

                    return (
                      <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                                {owner?.name.charAt(0) || '?'}
                             </div>
                             <div>
                                <p className="font-bold text-slate-900">{owner?.name || 'Unknown'}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{exp.date}</p>
                             </div>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">
                          <p className="truncate max-w-[200px]" title={exp.description}>{exp.description}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded inline-block border border-indigo-100">
                             {exp.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-black text-slate-900">{exp.convertedAmount.toFixed(2)}</p>
                          <p className="text-[10px] font-bold text-slate-400">Orig: {exp.amount} {exp.currency}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${globalStatus.color}`}>
                             <GlobalIcon className="w-3.5 h-3.5" />
                             {globalStatus.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setSelectedExpense(exp)}
                            className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors border shadow-sm ${
                              isPendingAction 
                              ? 'bg-purple-600 hover:bg-purple-700 text-white border-transparent hover:shadow-md' 
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isPendingAction ? 'Review Now' : 'View Details'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* --- EXPENSE DETAIL FULL-SCREEN MODAL --- */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 animate-fade-in overflow-y-auto">
          <div className="bg-slate-50 rounded-[28px] shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden my-auto border border-white/20">
            
            {/* Left: Detail Info Pane */}
            <div className="w-full md:w-5/12 bg-white p-8 sm:p-10 border-r border-slate-100 relative">
               <button onClick={() => setSelectedExpense(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors md:hidden">
                  <XCircle className="w-5 h-5" />
               </button>

               <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-2xl mb-6 border border-indigo-200 text-indigo-600">
                 <Receipt className="w-6 h-6" />
               </div>
               
               <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                 {selectedExpense.description}
               </h2>
               <div className="flex items-center gap-3 mb-8">
                 <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded">{selectedExpense.category}</span>
                 <span className="text-sm font-bold text-slate-400">{selectedExpense.date}</span>
               </div>

               <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 mb-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Amount (Requested)</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">
                    <span className="text-2xl text-slate-400 mr-1">$</span>
                    {selectedExpense.convertedAmount.toFixed(2)}
                  </p>
                  <p className="text-xs font-bold text-slate-500 mt-2">
                    Original receipt: <span className="text-slate-900 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200 inline-block">{selectedExpense.amount} {selectedExpense.currency}</span>
                  </p>
               </div>

               <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Submitted By</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-700">{mockStore.getUserById(selectedExpense.employeeId)?.name || 'Unknown'}</span>
                    </div>
                  </div>
               </div>
            </div>

            {/* Right: Approval Trail & Actions */}
            <div className="w-full md:w-7/12 p-8 sm:p-10 flex flex-col justify-between">
              
              <div className="flex justify-between items-start mb-8 hidden md:flex">
                <h3 className="font-bold text-lg text-slate-900">Approval Trail</h3>
                <button onClick={() => setSelectedExpense(null)} className="text-slate-400 hover:text-slate-600 bg-white shadow-sm border border-slate-200 rounded-full p-2 transition-all hover:scale-105">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Trail list */}
              <div className="space-y-6 flex-1 mb-8 overflow-y-auto pr-4">
                 {selectedExpense.approvalSteps.map((step, i) => {
                    const isCurrentUser = step.approverId === user?.id;
                    const isPendingAction = isCurrentUser && step.status === 'pending';
                    
                    let bg = 'bg-white border-slate-200';
                    let dot = 'bg-slate-300';
                    let statusLabel = 'Awaiting Review';
                    let statusColor = 'text-slate-500';

                    if (step.status === 'approved') {
                       bg = 'bg-emerald-50/50 border-emerald-100';
                       dot = 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
                       statusLabel = 'Approved';
                       statusColor = 'text-emerald-600';
                    } else if (step.status === 'rejected') {
                       bg = 'bg-rose-50/50 border-rose-100';
                       dot = 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]';
                       statusLabel = 'Rejected';
                       statusColor = 'text-rose-600';
                    } else if (isPendingAction) {
                       bg = 'bg-amber-50 border-amber-200 shadow-md ring-2 ring-amber-100';
                       dot = 'bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.6)]';
                    }

                    return (
                      <div key={i} className={`relative p-5 rounded-2xl border ${bg} transition-all`}>
                         <div className={`absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-4 border-slate-50 ${dot} z-10 hidden sm:block`}></div>
                         
                         <div className="flex items-center justify-between mb-2">
                           <span className="font-bold text-slate-800">{step.approverName} <span className="text-xs text-slate-400 font-medium ml-1">{isCurrentUser ? '(You)' : ''}</span></span>
                           <span className={`text-[10px] uppercase font-black tracking-widest ${statusColor}`}>{statusLabel}</span>
                         </div>
                         
                         {step.comment && (
                           <div className="bg-white/60 p-3 rounded-lg border border-black/5 text-sm font-medium text-slate-600 italic">
                             "{step.comment}"
                           </div>
                         )}

                         {step.timestamp && (
                           <p className="text-[10px] text-slate-400 font-bold mt-2">
                             Processed on {new Date(step.timestamp).toLocaleString()}
                           </p>
                         )}
                      </div>
                    );
                 })}
              </div>

              {/* Manager Actions Section */}
              {selectedExpense.approvalSteps.some(s => s.approverId === user?.id && s.status === 'pending') && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl shadow-slate-200/50">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Review Remarks (Optional)</label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={2}
                    placeholder="E.g. Approved per budget meeting..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all resize-none shadow-inner mb-4"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction('rejected')}
                      disabled={actionLoading}
                      className="flex-1 bg-white border-2 border-rose-200 hover:border-rose-300 hover:bg-rose-50 text-rose-600 font-bold py-3.5 rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" /> Reject
                    </button>
                    <button
                      onClick={() => handleAction('approved')}
                      disabled={actionLoading}
                      className="flex-[2] bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-200 hover:-translate-y-0.5 flex items-center justify-center gap-2 group"
                    >
                      {actionLoading ? 'Processing...' : (
                        <><CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" /> Approve Request</>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}