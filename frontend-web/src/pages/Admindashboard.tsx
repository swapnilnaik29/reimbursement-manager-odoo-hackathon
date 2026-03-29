import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import type { Role } from '../types';

type Tab = 'users' | 'rules';

export default function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  const headers = { Authorization: `Bearer ${token}` };

  // ─── Users state ───────────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee' as Role,
    managerId: '',
  });

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await axios.get<User[]>('/api/users', { headers });
      setUsers(res.data);
    } catch {
      // handle later
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setUserForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/api/users', userForm, { headers });
      setShowUserForm(false);
      setUserForm({ name: '', email: '', password: '', role: 'employee', managerId: '' });
      fetchUsers();
    } catch {
      // handle later
    } finally {
      setSubmitting(false);
    }
  };

  // Change a user's role directly from the table row
  const handleRoleChange = async (userId: string, role: Role) => {
    try {
      await axios.patch(`/api/users/${userId}/role`, { role }, { headers });
      fetchUsers();
    } catch {
      // handle later
    }
  };

  // Only managers can be assigned to employees
  const managers = users.filter(u => u.role === 'manager');

  const ROLE_COLORS: Record<string, string> = {
    admin:    'bg-orange-100 text-orange-700',
    manager:  'bg-purple-100 text-purple-700',
    employee: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">ReimburseFlow</span>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Hi, {user?.name}</span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800 transition">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-8">
          {([
            { id: 'users', label: 'User Management' },
            { id: 'rules', label: 'Approval Rules' },
          ] as { id: Tab; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Users</h2>
                <p className="text-sm text-gray-500">{users.length} total members</p>
              </div>
              <button
                onClick={() => setShowUserForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                + Add User
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {loadingUsers ? (
                <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
              ) : users.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">No users yet.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Name', 'Email', 'Role', 'Manager'].map(col => (
                        <th key={col} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3.5 font-medium text-gray-900">{u.name}</td>
                        <td className="px-5 py-3.5 text-gray-600">{u.email}</td>
                        <td className="px-5 py-3.5">
                          {/* Role can be changed inline */}
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 ${ROLE_COLORS[u.role]}`}
                          >
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-5 py-3.5 text-gray-500 text-sm">
                          {u.managerId
                            ? users.find(m => m.id === u.managerId)?.name ?? '—'
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── RULES TAB ── (coming next) */}
        {activeTab === 'rules' && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            Approval Rules coming soon.
          </div>
        )}

      </div>

      {/* ── Add User Modal ── */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">

            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Add New User</h3>
              <button
                onClick={() => setShowUserForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="px-6 py-5 space-y-4">

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={userForm.name}
                  onChange={handleUserFormChange}
                  required
                  placeholder="John Smith"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  value={userForm.email}
                  onChange={handleUserFormChange}
                  required
                  placeholder="john@company.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  name="password"
                  value={userForm.password}
                  onChange={handleUserFormChange}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Role</label>
                <select
                  name="role"
                  value={userForm.role}
                  onChange={handleUserFormChange}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Only show manager dropdown if role is employee */}
              {userForm.role === 'employee' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Assign Manager</label>
                  <select
                    name="managerId"
                    value={userForm.managerId}
                    onChange={handleUserFormChange}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="">No manager</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUserForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-2.5 rounded-lg text-sm transition"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}