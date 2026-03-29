import React, { useEffect, useState } from 'react';
import { companiesApi } from '../api/companies.api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { UserPlus, X, Users, Shield, UserCircle2 } from 'lucide-react';
import './Team.css';

const ROLE_CONFIG = {
  Admin:           { cls: 'role-admin',    label: 'Admin',          icon: <Shield size={13} /> },
  Senior_Manager:  { cls: 'role-manager',  label: 'Senior Manager', icon: <UserCircle2 size={13} /> },
  Manager:         { cls: 'role-manager',  label: 'Manager',        icon: <UserCircle2 size={13} /> },
  Employee:        { cls: 'role-employee', label: 'Employee',       icon: <UserCircle2 size={13} /> },
};

export default function Team() {
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing]       = useState(null); // { member, role, manager_id }

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await companiesApi.getMembers();
      setMembers(res.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleRoleUpdate = async () => {
    if (!editing) return;
    await companiesApi.updateMemberRole(editing.member._id, {
      role: editing.role,
      manager_id: editing.managerId || null,
    });
    setEditing(null);
    fetchMembers();
  };

  const managers = members.filter((m) => ['Manager', 'Senior_Manager', 'Admin'].includes(m.role));

  return (
    <div className="team-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Company Team</h2>
          <p className="page-subtitle">Manage your team members, roles, and reporting hierarchies.</p>
        </div>
        <Button variant="primary" onClick={() => setShowInvite(true)}>
          <UserPlus size={16} /> Invite Member
        </Button>
      </div>

      {/* Stats Strip */}
      <div className="team-stats">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <div key={role} className="team-stat-card">
            <div className={`role-dot ${cfg.cls}`} />
            <div>
              <p className="stat-label">{cfg.label}s</p>
              <p className="stat-num">{members.filter((m) => m.role === role).length}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">Loading team…</div>
      ) : (
        <Card>
          <CardHeader><CardTitle>All Members ({members.length})</CardTitle></CardHeader>
          <div className="members-table-wrapper">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Reports To</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const rc = ROLE_CONFIG[m.role] || ROLE_CONFIG.Employee;
                  return (
                    <tr key={m._id || m.id}>
                      <td>
                        <div className="member-cell">
                          <div className="member-avatar">{m.full_name?.charAt(0)}</div>
                          <div>
                            <p className="member-name">{m.full_name}</p>
                            <p className="member-email">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge ${rc.cls}`}>
                          {rc.icon} {rc.label}
                        </span>
                      </td>
                      <td className="text-muted">
                        {m.manager_id?.full_name || '—'}
                      </td>
                      <td className="text-muted">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        {m.role !== 'Admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing({ member: m, role: m.role, managerId: m.manager_id?._id || '' })}
                          >
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit Role Modal */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit {editing.member.full_name}</h3>
              <button className="icon-btn" onClick={() => setEditing(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label">Role</label>
                <select
                  className="input-control"
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                >
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="Senior_Manager">Senior Manager</option>
                </select>
              </div>
              <div className="input-group" style={{ marginTop: 16 }}>
                <label className="input-label">Reports To (Manager)</label>
                <select
                  className="input-control"
                  value={editing.managerId}
                  onChange={(e) => setEditing({ ...editing, managerId: e.target.value })}
                >
                  <option value="">— No direct manager —</option>
                  {managers
                    .filter((m) => m._id !== editing.member._id)
                    .map((m) => (
                      <option key={m._id} value={m._id}>{m.full_name} ({m.role})</option>
                    ))}
                </select>
              </div>
              <div className="modal-footer" style={{ marginTop: 24 }}>
                <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                <Button variant="primary" onClick={handleRoleUpdate}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={() => { setShowInvite(false); fetchMembers(); }}
        />
      )}
    </div>
  );
}

/* ─── Invite Modal ─────────────────────────────────────────────────── */
function InviteModal({ onClose, onInvited }) {
  const [form, setForm]     = useState({ email: '', full_name: '', role: 'Employee' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleInvite = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const res = await companiesApi.inviteMember(form);
      setSuccess(res.message || 'Invitation sent! A random password has been emailed.');
      setTimeout(onInvited, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Invite Team Member</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleInvite} className="modal-body">
          {error   && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}
          <Input label="Full Name" name="full_name" placeholder="Jane Doe" value={form.full_name} onChange={handleChange} required />
          <Input label="Email" name="email" type="email" placeholder="jane@acme.com" value={form.email} onChange={handleChange} required />
          <div className="input-group">
            <label className="input-label">Role</label>
            <select className="input-control" name="role" value={form.role} onChange={handleChange}>
              <option value="Employee">Employee</option>
              <option value="Manager">Manager</option>
              <option value="Senior_Manager">Senior Manager</option>
            </select>
          </div>
          <p className="invite-hint">
            A secure random password will be auto-generated and emailed to the invitee.
          </p>
          <div className="modal-footer" style={{ marginTop: 20 }}>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={loading}>
              <UserPlus size={16} /> Send Invite
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
