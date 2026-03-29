import React, { useEffect, useState } from 'react';
import { expensesApi } from '../api/expenses.api';
import { useAuthStore } from '../store/useAuthStore';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import './Expenses.css';
import {
  Plus, Receipt, Search, X, Upload, CheckCircle2,
  Clock, FileEdit, XCircle, ChevronRight, ExternalLink, RefreshCw, Zap, Save, Edit2
} from 'lucide-react';

// Backend base URL for resolving receipt paths
const BACKEND_URL = 'http://localhost:8000';

const STATUS_CONFIG = {
  Draft:            { label: 'Draft',            cls: 'badge-gray',   icon: <FileEdit size={12} /> },
  Submitted:        { label: 'Submitted',         cls: 'badge-blue',   icon: <Clock size={12} /> },
  Pending_Approval: { label: 'Pending Approval',  cls: 'badge-yellow', icon: <Clock size={12} /> },
  Pending:          { label: 'Pending',           cls: 'badge-yellow', icon: <Clock size={12} /> },
  Approved:         { label: 'Approved',          cls: 'badge-green',  icon: <CheckCircle2 size={12} /> },
  Rejected:         { label: 'Rejected',          cls: 'badge-red',    icon: <XCircle size={12} /> },
  Cancelled:        { label: 'Cancelled',         cls: 'badge-gray',   icon: <X size={12} /> },
};

function resolveReceiptUrl(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url}`;
}

export default function Expenses() {
  const user = useAuthStore((s) => s.user);
  const isAdmin    = user?.role === 'Admin';
  const isManager  = user?.role === 'Manager';
  const isEmployee = user?.role === 'Employee';

  const [expenses, setExpenses]        = useState([]);
  const [filtered, setFiltered]        = useState([]);
  const [loading, setLoading]          = useState(true);
  const [search, setSearch]            = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal]      = useState(false);
  const [selectedExpense, setSelected] = useState(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const fn  = (isAdmin || isManager) ? expensesApi.getAllExpenses : expensesApi.getMyExpenses;
      const res = await fn();
      const list = res.data || [];
      setExpenses(list);
      setFiltered(list);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchExpenses(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      expenses.filter((e) => {
        const matchSearch =
          e.title?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.status?.toLowerCase().includes(q) ||
          e.submitted_by?.full_name?.toLowerCase().includes(q);
        const matchStatus =
          statusFilter === 'all' || e.status === statusFilter;
        return matchSearch && matchStatus;
      })
    );
  }, [search, statusFilter, expenses]);

  const handleSubmitDraft = async (expense) => {
    await expensesApi.submitExpense(expense._id || expense.id);
    fetchExpenses();
    setSelected(null);
  };

  const STATUSES = ['all', 'Draft', 'Submitted', 'Pending_Approval', 'Approved', 'Rejected'];

  return (
    <div className="expenses-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            {(isAdmin || isManager) ? 'All Company Expenses' : 'My Expenses'}
          </h2>
          <p className="page-subtitle">
            {(isAdmin || isManager)
              ? 'View and monitor every expense across your organisation.'
              : 'Track your submitted and pending reimbursements.'}
          </p>
        </div>
        {/* Only Employees can create new expenses */}
        {isEmployee && (
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Expense
          </Button>
        )}
      </div>

      {/* Filters row */}
      <div className="filters-row">
        <div className="search-bar">
          <Search size={18} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search title, category, submitter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="status-filters">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-state">Loading expenses…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-card">
          <Receipt size={48} color="var(--text-placeholder)" />
          <h3>No expenses found</h3>
          <p>{isEmployee ? 'Submit a new expense to get started.' : 'No expenses match your filter.'}</p>
        </div>
      ) : (
        <Card>
          <div className="expense-table-wrapper">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                  {(isAdmin || isManager) && <th>Submitted By</th>}
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp) => {
                  const cfg = STATUS_CONFIG[exp.status] || STATUS_CONFIG.Draft;
                  return (
                    <tr key={exp._id || exp.id} onClick={() => setSelected(exp)}>
                      <td className="expense-title">{exp.title}</td>
                      <td>
                        {exp.category
                          ? <span className="category-pill">{exp.category}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="expense-amount">
                        {exp.original_amount?.toLocaleString()} {exp.original_currency}
                        {exp.converted_amount && exp.converted_currency !== exp.original_currency && (
                          <span className="converted-label">
                            ≈ {exp.converted_amount?.toFixed(2)} {exp.converted_currency}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${cfg.cls}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      {(isAdmin || isManager) && (
                        <td className="text-muted">{exp.submitted_by?.full_name || '—'}</td>
                      )}
                      <td className="text-muted">
                        {new Date(exp.createdAt).toLocaleDateString()}
                      </td>
                      <td><ChevronRight size={16} color="var(--text-muted)" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Expense Detail Drawer */}
      {selectedExpense && (
        <ExpenseDrawer
          expense={selectedExpense}
          onClose={() => setSelected(null)}
          onRefresh={() => { fetchExpenses(); setSelected(null); }}
          isEmployee={isEmployee}
        />
      )}

      {/* Create Expense Modal — Employee only */}
      {showModal && (
        <CreateExpenseModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchExpenses(); }}
        />
      )}
    </div>
  );
}

/* ─── Expense Detail Drawer ─────────────────────────────────────── */
function ExpenseDrawer({ expense, onClose, onRefresh, isEmployee }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm]   = useState({
    title: expense.title, description: expense.description || '', category: expense.category || '',
  });
  const [saving, setSaving]       = useState(false);
  
  const cfg        = STATUS_CONFIG[expense.status] || STATUS_CONFIG.Draft;
  const receiptUrl = resolveReceiptUrl(expense.receipt_url);

  const canEdit = isEmployee && !['Approved', 'Rejected', 'Cancelled'].includes(expense.status);

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await expensesApi.editExpense(expense._id || expense.id, editForm);
      setIsEditing(false);
      onRefresh();
    } catch(err) {
      alert(err.message || 'Failed to update expense');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await expensesApi.submitExpense(expense._id || expense.id);
      onRefresh();
    } catch(err) {
      alert(err.message);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          {isEditing ? (
            <Input name="title" value={editForm.title} style={{ marginBottom: 0 }}
              onChange={(e) => setEditForm({...editForm, title: e.target.value})} />
          ) : (
            <h3>{expense.title}</h3>
          )}
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="drawer-body">
          {canEdit && !isEditing && (
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} style={{ marginBottom: 16 }}>
              <Edit2 size={14} /> Edit Expense
            </Button>
          )}

          <div className="detail-row">
            <span>Status</span>
            <span className={`badge ${cfg.cls}`}>{cfg.icon} {cfg.label}</span>
          </div>
          <div className="detail-row">
            <span>Amount</span>
            <strong>{expense.original_amount?.toLocaleString()} {expense.original_currency}</strong>
          </div>
          {expense.converted_amount && (
            <div className="detail-row">
              <span>Converted To</span>
              <strong>{expense.converted_amount?.toFixed(2)} {expense.converted_currency}</strong>
            </div>
          )}
          <div className="detail-row" style={{ alignItems: isEditing ? 'center' : 'flex-start' }}>
            <span>Category</span>
            {isEditing ? (
              <select className="input-control" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
                <option value="">— Select —</option>
                {['Travel','Meals','Accommodation','Software','Hardware','Training','Marketing','Office Supplies','Other'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
               <span>{expense.category || '—'}</span>
            )}
          </div>
          <div className="detail-row" style={{ flexDirection: 'column' }}>
            <span style={{ marginBottom: 4 }}>Description</span>
            {isEditing ? (
              <textarea className="input-control" rows={3} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
            ) : (
              <p style={{ color: 'var(--text-main)', fontSize: '.9rem', margin: 0 }}>{expense.description || '—'}</p>
            )}
          </div>
          <div className="detail-row">
            <span>Submitted At</span>
            <span>{expense.submitted_at ? new Date(expense.submitted_at).toLocaleString() : '—'}</span>
          </div>

          {/* Receipt Preview / Link */}
          {receiptUrl && (
            <div className="receipt-preview-section">
              <p className="receipt-label">Receipt</p>
              {receiptUrl.match(/\.(png|jpg|jpeg|webp|gif)$/i) ? (
                <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                  <img src={receiptUrl} alt="Receipt" className="receipt-img" />
                </a>
              ) : (
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="receipt-link"
                >
                  <ExternalLink size={14} /> View Receipt File
                </a>
              )}
            </div>
          )}

          {isEditing && (
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <Button variant="secondary" onClick={() => setIsEditing(false)} className="w-full">Cancel</Button>
              <Button variant="primary" onClick={handleSaveEdit} isLoading={saving} className="w-full">Save Changes</Button>
            </div>
          )}

          {/* Submit action — only for Employee drafts */}
          {isEmployee && expense.status === 'Draft' && !isEditing && (
            <Button
              variant="primary"
              className="w-full"
              style={{ marginTop: 24 }}
              onClick={handleSubmit}
            >
              <Upload size={16} /> Submit for Approval
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Create Expense Modal ─────────────────────────────────────── */
function CreateExpenseModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', category: '', amount: '', currency: 'USD',
  });
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [scanning, setScanning] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }

    // Auto-scan using Python backend via proxy
    if (f.type.startsWith('image/') || f.type.endsWith('pdf')) {
      setScanning(true);
      try {
        const fd = new FormData();
        fd.append('file', f);
        const res = await expensesApi.scanReceipt(fd);
        if (res.data?.success && res.data?.data) {
          const { amount, description, expense_type, name_of_restaurant } = res.data.data;
          setForm(prev => ({
            ...prev,
            title: name_of_restaurant || prev.title,
            amount: amount ? amount.replace(/[^0-9.]/g, '') : prev.amount,
            description: description || prev.description,
            category: expense_type && ['Travel','Meals','Accommodation','Software','Hardware','Training','Marketing','Office Supplies'].includes(expense_type) 
                      ? expense_type 
                      : prev.category || 'Other'
          }));
        }
      } catch(err) {
        console.warn('OCR Scan failed:', err.message);
      } finally {
        setScanning(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      if (file) fd.append('receipt', file);
      await expensesApi.createManual(fd);
      onCreated();
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
          <h3>New Expense</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="auth-error">{error}</div>}
          
          {scanning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'var(--bg-input)', borderRadius: 8, marginBottom: 16 }}>
              <Zap size={16} color="var(--primary)" />
              <span style={{ fontSize: '.875rem', color: 'var(--text-main)', fontWeight: 500 }}>Scanning receipt with AI...</span>
            </div>
          )}

          <Input label="Title *" name="title" placeholder="Flight to Bangalore"
            value={form.title} onChange={handleChange} required />

          <div style={{ display: 'flex', gap: 16 }}>
            <Input label="Amount *" name="amount" type="number" placeholder="1500"
              value={form.amount} onChange={handleChange} required />
            <div className="input-group" style={{ width: 110, flexShrink: 0 }}>
              <label className="input-label">Currency</label>
              <select className="input-control" name="currency"
                value={form.currency} onChange={handleChange}>
                {['USD','EUR','GBP','INR','AED','SGD','CAD','AUD','JPY','CNY'].map(c=>(
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Category</label>
            <select className="input-control" name="category"
              value={form.category} onChange={handleChange}>
              <option value="">— Select category —</option>
              {['Travel','Meals','Accommodation','Software','Hardware','Training','Marketing','Office Supplies','Other'].map(c=>(
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Description</label>
            <textarea className="input-control" name="description" rows={3}
              placeholder="Add context about this expense…"
              value={form.description} onChange={handleChange} />
          </div>

          {/* File Upload with Preview */}
          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Receipt (optional)</label>
            <div
              className="file-drop"
              onClick={() => document.getElementById('receipt-input').click()}
            >
              {preview ? (
                <img src={preview} alt="Preview" className="file-preview-img" />
              ) : (
                <>
                  <Upload size={20} color="var(--text-muted)" />
                  <span>{file ? file.name : 'Click to upload PNG, JPG or PDF (max 5MB)'}</span>
                </>
              )}
              <input
                id="receipt-input"
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
            {file && !preview && (
              <p className="file-name-label">📎 {file.name}</p>
            )}
          </div>

          <div className="modal-footer">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={loading}>Submit Expense</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
