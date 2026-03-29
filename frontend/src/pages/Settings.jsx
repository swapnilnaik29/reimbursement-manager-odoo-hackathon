import React, { useEffect, useState } from 'react';
import { approvalsApi } from '../api/approvals.api';
import { companiesApi } from '../api/companies.api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import {
  Plus, Trash2, X, Settings2, Building2,
  ArrowRight, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import './Settings.css';

const RULE_TYPES = {
  Sequential: {
    label: 'Sequential — First Available',
    cls: 'tag-blue',
    desc: 'Routes to the first Manager (or specified role) in the company. Works without manager assignments.',
    defaultConfig: { approver_role: 'Manager' },
    configHelp: 'approver_role: "Manager" | "Admin"'
  },
  Direct_Manager: {
    label: 'Direct Manager',
    cls: 'tag-green',
    desc: 'Routes to the submitter\'s directly assigned manager. Requires each Employee to have a manager set in Team.',
    defaultConfig: { approver_role: 'Direct_Manager' },
    configHelp: 'No extra config needed — uses the submitter\'s assigned manager.'
  },
  Percentage: {
    label: 'Quorum (% Approval)',
    cls: 'tag-purple',
    desc: 'ALL managers are notified; expense advances when X% of them approve.',
    defaultConfig: { approver_role: 'Manager', percentage: 60 },
    configHelp: 'approver_role: "Manager", percentage: 60 (means 60% must approve)'
  },
  Role_Override: {
    label: 'Role Override (Final Authority)',
    cls: 'tag-orange',
    desc: 'Bypasses normal flow and routes directly to a specific role (e.g. Admin). Use as final step.',
    defaultConfig: { override_role: 'Admin' },
    configHelp: 'override_role: "Admin" | "Manager"'
  },
};

export default function Settings() {
  const [tab, setTab] = useState('company');

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-subtitle">Configure company profile and multi-step approval workflows.</p>
        </div>
      </div>

      <div className="settings-tabs">
        <button className={`tab-btn ${tab === 'company' ? 'active' : ''}`} onClick={() => setTab('company')}>
          <Building2 size={16} /> Company
        </button>
        <button className={`tab-btn ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')}>
          <Settings2 size={16} /> Approval Workflow
        </button>
      </div>

      {tab === 'company' && <CompanySettings />}
      {tab === 'rules'   && <ApprovalRulesSettings />}
    </div>
  );
}

/* ─── Company Settings ─────────────────────────────────────────── */
function CompanySettings() {
  const [form, setForm]     = useState({ name: '', default_currency: '', country_code: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  useEffect(() => {
    companiesApi.getMyCompany().then((res) => {
      const c = res.data;
      setForm({ name: c.name || '', default_currency: c.default_currency || '', country_code: c.country_code || '' });
      setLoading(false);
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSuccess(''); setError('');
    try {
      await companiesApi.updateCompany(form);
      setSuccess('Company details updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="loading-state">Loading…</div>;

  return (
    <Card>
      <CardHeader><CardTitle>Company Profile</CardTitle></CardHeader>
      <CardContent>
        {success && <div className="auth-success" style={{ marginBottom: 20 }}>{success}</div>}
        {error   && <div className="auth-error"   style={{ marginBottom: 20 }}>{error}</div>}
        <form onSubmit={handleSave} style={{ maxWidth: 480 }}>
          <Input label="Company Name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div style={{ display: 'flex', gap: 16 }}>
            <Input label="Default Currency (ISO 4217)" placeholder="INR"
              value={form.default_currency}
              onChange={(e) => setForm({ ...form, default_currency: e.target.value.toUpperCase() })}
              maxLength={3} />
            <Input label="Country Code" placeholder="IN"
              value={form.country_code}
              onChange={(e) => setForm({ ...form, country_code: e.target.value.toUpperCase() })}
              maxLength={2} />
          </div>
          <Button type="submit" variant="primary" isLoading={saving}>Save Changes</Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Approval Rules (Workflow Builder) ────────────────────────── */
function ApprovalRulesSettings() {
  const [rules, setRules]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await approvalsApi.getRules();
      setRules(res.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRules(); }, []);

  const handleDelete = async (ruleId) => {
    if (!confirm('Delete this approval step? The workflow will be re-evaluated.')) return;
    await approvalsApi.deleteRule(ruleId);
    fetchRules();
  };

  return (
    <div className="rules-section">
      {/* Explainer banner */}
      <div className="workflow-explainer">
        <Info size={16} />
        <div>
          <strong>How multi-step approval works</strong>
          <p>
            Add rules ordered by <strong>Step Number</strong>. When an Employee submits an expense, it flows
            through each step in order — Step 1 first, then Step 2, and so on.
            You can chain unlimited steps: e.g. <em>Step 1 → Direct Manager → Step 2 → Admin final sign-off</em>.
            The expense is only marked <strong>Approved</strong> after all steps are completed.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="rules-header">
            <CardTitle>Approval Steps ({rules.length})</CardTitle>
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={15} /> Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="loading-state">Loading…</div>
          ) : rules.length === 0 ? (
            <div className="empty-rules">
              <p>No approval steps configured.</p>
              <p style={{ marginTop: 8 }}>
                Without rules, all expenses are <strong>auto-approved</strong> immediately.
              </p>
              <Button variant="primary" size="sm" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
                <Plus size={14} /> Add First Step
              </Button>
            </div>
          ) : (
            <div className="workflow-pipeline">
              {rules.map((rule, idx) => {
                const cfg = RULE_TYPES[rule.rule_type] || {};
                return (
                  <React.Fragment key={rule._id}>
                    <div className="workflow-step">
                      <div className="step-badge">Step {rule.step_order}</div>
                      <div className="step-details">
                        <div className="step-name-row">
                          <strong>{rule.name}</strong>
                          <span className={`rule-tag ${cfg.cls}`}>{cfg.label?.split('—')[0].trim()}</span>
                        </div>
                        <p className="step-desc">{cfg.desc}</p>
                        {(rule.min_amount != null || rule.max_amount != null) && (
                          <p className="step-filter">
                            💰 Amount filter:
                            {rule.min_amount ? ` ≥ ${rule.min_amount}` : ''}
                            {rule.min_amount && rule.max_amount ? ' —' : ''}
                            {rule.max_amount ? ` ≤ ${rule.max_amount}` : ''}
                          </p>
                        )}
                        {rule.category && (
                          <p className="step-filter">🏷️ Category: {rule.category}</p>
                        )}
                      </div>
                      <button className="icon-btn rule-delete" onClick={() => handleDelete(rule._id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {idx < rules.length - 1 && (
                      <div className="step-arrow">
                        <ArrowRight size={20} color="var(--text-muted)" />
                        <span>then</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <AddRuleModal
          nextStep={rules.length + 1}
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); fetchRules(); }}
        />
      )}
    </div>
  );
}

/* ─── Add Rule Modal ───────────────────────────────────────────── */
function AddRuleModal({ nextStep, onClose, onCreated }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState({
    name:       '',
    step_order: nextStep,
    rule_type:  'Sequential',
    min_amount: '',
    max_amount: '',
    category:   '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleTypeChange = (e) => {
    setForm({ ...form, rule_type: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ruleType = RULE_TYPES[form.rule_type];
      await approvalsApi.createRule({
        name:       form.name,
        step_order: Number(form.step_order),
        rule_type:  form.rule_type,
        min_amount: form.min_amount ? Number(form.min_amount) : null,
        max_amount: form.max_amount ? Number(form.max_amount) : null,
        category:   form.category || null,
        config:     ruleType.defaultConfig,
      });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const selectedType = RULE_TYPES[form.rule_type];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Approval Step</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="auth-error">{error}</div>}

          <div style={{ display: 'flex', gap: 16 }}>
            <Input
              label="Step Name *"
              placeholder="e.g. Manager Review, Final Admin Approval"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Step #"
              type="number"
              min="1"
              value={form.step_order}
              onChange={(e) => setForm({ ...form, step_order: e.target.value })}
              style={{ width: 80, flexShrink: 0 }}
              required
            />
          </div>

          <div className="input-group" style={{ marginBottom: 16 }}>
            <label className="input-label">Approver Type *</label>
            <select className="input-control" value={form.rule_type} onChange={handleTypeChange}>
              {Object.entries(RULE_TYPES).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>
            {selectedType && (
              <div className="rule-type-info">
                <p>{selectedType.desc}</p>
                <code>{selectedType.configHelp}</code>
              </div>
            )}
          </div>

          {/* Optional filters */}
          <button
            type="button"
            className="advanced-toggle"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {showAdvanced ? 'Hide' : 'Show'} optional filters (amount range, category)
          </button>

          {showAdvanced && (
            <div className="advanced-fields">
              <p className="advanced-note">
                Filters narrow which expenses this step applies to. Leave blank to apply to all.
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <Input label="Min Amount" type="number" placeholder="0"
                  value={form.min_amount}
                  onChange={(e) => setForm({ ...form, min_amount: e.target.value })} />
                <Input label="Max Amount" type="number" placeholder="unlimited"
                  value={form.max_amount}
                  onChange={(e) => setForm({ ...form, max_amount: e.target.value })} />
              </div>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="input-label">Category (optional)</label>
                <select className="input-control" value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">— All categories —</option>
                  {['Travel','Meals','Accommodation','Software','Hardware','Training','Marketing','Office Supplies','Other'].map(c=>(
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="modal-footer" style={{ marginTop: 20 }}>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={loading}>
              <Plus size={14} /> Add Step
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
