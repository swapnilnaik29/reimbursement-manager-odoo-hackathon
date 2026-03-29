import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockStore } from '../store/mockStore';
import type { User, Role, ApprovalRule } from '../types';
import { ShieldCheck, Users, Settings, Plus, LogOut, CheckCircle2, Trash2 } from 'lucide-react';

type Tab = 'users' | 'rules';

const CATEGORIES = [
  'Travel', 'Meals', 'Accommodation', 'Office Supplies',
  'Software', 'Training', 'Medical', 'Miscellaneous',
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // --- Users State ---
  const [users, setUsers] = useState<User[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', role: 'employee' as Role, managerId: '',
  });

  // --- Rules State ---
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleForm, setRuleForm] = useState<Partial<ApprovalRule>>({
    name: '', category: '', minApprovalPercentage: 100, isManagerApproverFirst: false,
    approvers: []
  });

  const fetchData = () => {
    setUsers(mockStore.getUsers());
    setRules(mockStore.getApprovalRules());
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Handle Users ---
  const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUserForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    mockStore.createUser({
      id: 'usr_' + Date.now(),
      name: userForm.name,
      email: userForm.email,
      role: userForm.role,
      managerId: userForm.role === 'employee' ? userForm.managerId : undefined,
      companyId: user?.companyId || ''
    });
    setShowUserForm(false);
    setUserForm({ name: '', email: '', password: '', role: 'employee', managerId: '' });
    fetchData();
  };

  const handleRoleChange = (userId: string, role: Role) => {
    mockStore.updateUserRole(userId, role);
    fetchData();
  };

  // --- Handle Rules ---
  const handleAddApproverToRule = (userId: string) => {
    const selectedUser = users.find(u => u.id === userId);
    if (!selectedUser) return;
    
    setRuleForm(prev => {
      const existing = prev.approvers || [];
      // Prevent duplicates
      if (existing.find(a => a.userId === userId)) return prev;

      return {
        ...prev,
        approvers: [...existing, {
          userId,
          name: selectedUser.name,
          sequence: existing.length + 1,
          isRequired: true
        }]
      };
    });
  };

  const handleRemoveApproverFromRule = (userId: string) => {
    setRuleForm(prev => ({
      ...prev,
      approvers: prev.approvers?.filter(a => a.userId !== userId).map((a, i) => ({ ...a, sequence: i + 1 }))
    }));
  };

  const handleToggleApproverRequired = (userId: string) => {
    setRuleForm(prev => ({
      ...prev,
      approvers: prev.approvers?.map(a => a.userId === userId ? { ...a, isRequired: !a.isRequired } : a)
    }));
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.category || !ruleForm.name) return;

    const newRule: ApprovalRule = {
      id: ruleForm.id || 'rule_' + Date.now(),
      name: ruleForm.name,
      category: ruleForm.category,
      approvers: ruleForm.approvers || [],
      minApprovalPercentage: ruleForm.minApprovalPercentage || 100,
      isManagerApproverFirst: ruleForm.isManagerApproverFirst || false
    };

    mockStore.createApprovalRule(newRule);
    setShowRuleForm(false);
    setRuleForm({ name: '', category: '', minApprovalPercentage: 100, isManagerApproverFirst: false, approvers: [] });
    fetchData();
  };

  const managers = users.filter(u => u.role === 'manager');
  const potentialApprovers = users.filter(u => u.role === 'manager' || u.role === 'admin');

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden lg:flex">
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Admin Panel</span>
        </div>

        <div className="p-4 flex-1">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 mt-4">Management</p>
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Users className="w-5 h-5 mr-3" /> User Accounts
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === 'rules' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}
            >
              <Settings className="w-5 h-5 mr-3" /> Approval Rules
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center px-4 py-3 bg-slate-800 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white mr-3">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">Administrator</p>
            </div>
          </div>
          <button onClick={logout} className="w-full mt-3 flex items-center justify-center px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4">
          <div className="flex items-center">
            <ShieldCheck className="w-6 h-6 text-indigo-600 mr-2" />
            <span className="font-bold text-slate-900">Admin Panel</span>
          </div>
          <button onClick={logout} className="p-2 text-slate-500">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Topbar tabs for mobile */}
        <div className="lg:hidden bg-white px-4 py-2 flex gap-2 overflow-x-auto border-b border-slate-200">
            <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeTab === 'users' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>Users</button>
            <button onClick={() => setActiveTab('rules')} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${activeTab === 'rules' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>Approval Rules</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-50">
          
          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="max-w-6xl mx-auto animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Directory</h1>
                  <p className="text-sm text-slate-500 mt-1">Manage team members and their roles.</p>
                </div>
                <button
                  onClick={() => setShowUserForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add User
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Manager</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-400">No users found.</td></tr>
                    ) : users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                             {u.name.charAt(0)}
                           </div>
                           {u.name}
                        </td>
                        <td className="px-6 py-4 text-slate-500">{u.email}</td>
                        <td className="px-6 py-4">
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none ${
                              u.role === 'admin' ? 'bg-orange-100 text-orange-700' :
                              u.role === 'manager' ? 'bg-purple-100 text-purple-700' :
                              'bg-blue-100 text-blue-700'
                            }`}
                          >
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {u.managerId ? users.find(m => m.id === u.managerId)?.name || 'Unknown' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RULES TAB */}
          {activeTab === 'rules' && (
            <div className="max-w-6xl mx-auto animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Approval Workflows</h1>
                  <p className="text-sm text-slate-500 mt-1">Configure automated routing based on categories.</p>
                </div>
                <button
                  onClick={() => setShowRuleForm(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Create Rule
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rules.length === 0 ? (
                  <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 text-slate-500">
                    <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-medium text-slate-700">No active rules</p>
                    <p className="text-sm mt-1">Expenses will auto-approve or route to direct managers.</p>
                  </div>
                ) : rules.map(rule => (
                  <div key={rule.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-100 to-transparent rounded-bl-[100px] opacity-50 z-0 pointer-events-none"></div>
                    <div className="relative z-10 flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1 block">{rule.category}</span>
                          <h3 className="text-lg font-bold text-slate-900">{rule.name}</h3>
                        </div>
                        <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200">
                          {rule.minApprovalPercentage}% required
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Approval Sequence</p>
                        <div className="space-y-2">
                          {rule.approvers.map((app, i) => (
                            <div key={app.userId} className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                                {i + 1}
                              </div>
                              <span className="text-sm font-medium text-slate-700">{app.name}</span>
                              {app.isRequired && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                              {!app.isRequired && <span className="text-[10px] font-bold text-slate-400 ml-auto uppercase tracking-wider bg-white px-2 py-0.5 rounded border border-slate-100">Optional</span>}
                            </div>
                          ))}
                          {rule.approvers.length === 0 && (
                            <span className="text-sm text-slate-400 italic">No approvers specified.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- ADD USER MODAL --- */}
      {showUserForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-transform">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Add Team Member</h3>
              <button onClick={() => setShowUserForm(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors">
                 <Trash2 style={{display: 'none'}} />
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Full Name</label>
                <input type="text" name="name" value={userForm.name} onChange={handleUserFormChange} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Email</label>
                <input type="email" name="email" value={userForm.email} onChange={handleUserFormChange} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Role</label>
                <select name="role" value={userForm.role} onChange={handleUserFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors">
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {userForm.role === 'employee' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="block text-sm font-semibold text-slate-700">Assign Manager</label>
                  <select name="managerId" value={userForm.managerId} onChange={handleUserFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors">
                    <option value="">No manager (Or auto-assign)</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowUserForm(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors hidden sm:block">Cancel</button>
                <button type="submit" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md shadow-indigo-200 transition-all active:scale-95">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CREATE RULE MODAL --- */}
      {showRuleForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg text-slate-900">Create Approval Rule</h3>
              <button onClick={() => setShowRuleForm(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700">Rule Name</label>
                  <input type="text" value={ruleForm.name} onChange={e => setRuleForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Executive Travel" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white" />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="block text-sm font-semibold text-slate-700">Expense Category</label>
                  <select value={ruleForm.category} onChange={e => setRuleForm(p => ({ ...p, category: e.target.value }))} required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white">
                    <option value="" disabled>Select category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Minimum Approval Threshold (%)</label>
                <div className="flex items-center gap-4">
                  <input type="range" min="1" max="100" value={ruleForm.minApprovalPercentage} onChange={e => setRuleForm(p => ({ ...p, minApprovalPercentage: parseInt(e.target.value) }))} className="w-full accent-indigo-600" />
                  <span className="w-12 text-center font-bold text-slate-700 bg-slate-100 py-1 rounded-lg">{ruleForm.minApprovalPercentage}%</span>
                </div>
                <p className="text-xs text-slate-500">How many sequence steps must explicitly approve for finalization</p>
              </div>

              <hr className="border-slate-100" />

              <div>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800">Approver Sequence</h4>
                    <p className="text-xs text-slate-500">Add managers or admins to establish an approval chain.</p>
                  </div>
                  <div className="relative group">
                    <select
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      value=""
                      onChange={e => handleAddApproverToRule(e.target.value)}
                    >
                      <option value="" disabled>Add to sequence</option>
                      {potentialApprovers.filter(pa => !ruleForm.approvers?.find(a => a.userId === pa.id)).map(pa => (
                        <option key={pa.id} value={pa.id}>{pa.name} ({pa.role})</option>
                      ))}
                    </select>
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
                      <Plus className="w-4 h-4" /> Add Approver
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 min-h-[100px] flex flex-col gap-2">
                   {(!ruleForm.approvers || ruleForm.approvers.length === 0) ? (
                      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic">
                        No approvers selected. Select from top right.
                      </div>
                   ) : (
                      ruleForm.approvers.map((app, index) => (
                        <div key={app.userId} className="bg-white border border-slate-200 p-3 rounded-xl flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-3">
                            <span className="bg-indigo-100 text-indigo-700 w-6 h-6 rounded-md flex items-center justify-center text-xs font-black">{index + 1}</span>
                            <span className="font-bold text-slate-700">{app.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center cursor-pointer gap-2">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Required</span>
                              <div className="relative">
                                <input type="checkbox" className="sr-only" checked={app.isRequired} onChange={() => handleToggleApproverRequired(app.userId)} />
                                <div className={`block w-10 h-6 rounded-full transition-colors ${app.isRequired ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${app.isRequired ? 'transform translate-x-4' : ''}`}></div>
                              </div>
                            </label>
                            <button onClick={() => handleRemoveApproverFromRule(app.userId)} className="text-slate-400 hover:text-red-500 transition-colors p-1 bg-slate-50 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                   )}
                </div>
              </div>

            </div>
            
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50/50">
              <button type="button" onClick={() => setShowRuleForm(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors hidden sm:block">Cancel</button>
              <button onClick={handleSaveRule} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-md shadow-indigo-200 transition-all active:scale-95 disabled:bg-indigo-300 disabled:shadow-none bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200">
                Save Rule
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}