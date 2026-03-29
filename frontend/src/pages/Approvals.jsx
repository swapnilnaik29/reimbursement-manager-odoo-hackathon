import React, { useEffect, useState } from 'react';
import { approvalsApi } from '../api/approvals.api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { CheckCircle2, XCircle, X, Clock, Inbox } from 'lucide-react';
import './Approvals.css';

export default function Approvals() {
  const [queue, setQueue]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await approvalsApi.getMyQueue();
      setQueue(res.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQueue(); }, []);

  const handleDecide = async (requestId, decision, comment) => {
    await approvalsApi.decide(requestId, { decision, comment });
    setSelected(null);
    fetchQueue();
  };

  return (
    <div className="approvals-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Approvals Queue</h2>
          <p className="page-subtitle">
            Review and action pending expense requests assigned to you.
          </p>
        </div>
        <div className="queue-count-badge">{queue.length} pending</div>
      </div>

      {loading ? (
        <div className="loading-state">Loading queue…</div>
      ) : queue.length === 0 ? (
        <div className="empty-card">
          <Inbox size={48} color="var(--text-placeholder)" />
          <h3>Queue is empty</h3>
          <p>No pending approvals assigned to you right now.</p>
        </div>
      ) : (
        <div className="queue-list">
          {queue.map((item) => {
            const exp = item.expense_id || {};
            return (
              <Card key={item._id} className="queue-card" onClick={() => setSelected(item)}>
                <CardContent>
                  <div className="queue-card-inner">
                    <div className="queue-info">
                      <div className="queue-avatar">
                        {exp?.submitted_by?.full_name?.charAt(0) || 'E'}
                      </div>
                      <div>
                        <p className="queue-expense-title">{exp.title || 'Untitled Expense'}</p>
                        <p className="queue-submitter">
                          {exp?.submitted_by?.full_name || 'Unknown'} &middot; {exp?.category || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="queue-meta">
                      <div className="queue-amount">
                        <strong>{exp.original_amount?.toLocaleString()} {exp.original_currency}</strong>
                        {exp.converted_amount && exp.converted_currency !== exp.original_currency && (
                          <span className="converted-label">
                            ≈ {exp.converted_amount?.toFixed(2)} {exp.converted_currency}
                          </span>
                        )}
                      </div>
                      <span className="badge badge-yellow">
                        <Clock size={12} /> Step {item.step_order}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selected && (
        <DecisionModal
          item={selected}
          onClose={() => setSelected(null)}
          onDecide={handleDecide}
        />
      )}
    </div>
  );
}

/* ─── Decision Modal ───────────────────────────────────────────────── */
function DecisionModal({ item, onClose, onDecide }) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const exp = item.expense_id || {};

  const decide = async (decision) => {
    if (decision === 'Rejected' && !comment.trim()) {
      setError('A comment is required when rejecting.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onDecide(item._id, decision, comment);
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
          <h3>Review Expense</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="decision-expense-info">
            <p className="decision-title">{exp.title}</p>
            <p className="decision-meta">{exp?.submitted_by?.full_name} &middot; {exp.category}</p>
            <div className="decision-amount">
              {exp.original_amount?.toLocaleString()} {exp.original_currency}
            </div>
            {exp.description && (
              <p className="decision-description">{exp.description}</p>
            )}
          </div>

          <div className="input-group" style={{ marginTop: 20 }}>
            <label className="input-label">Comment {' '}
              <span className="text-muted">(required for rejection)</span>
            </label>
            <textarea
              className="input-control"
              rows={3}
              placeholder="Add a note for the submitter…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="decision-actions">
            <Button
              variant="danger"
              onClick={() => decide('Rejected')}
              isLoading={loading}
            >
              <XCircle size={16} /> Reject
            </Button>
            <Button
              variant="primary"
              onClick={() => decide('Approved')}
              isLoading={loading}
            >
              <CheckCircle2 size={16} /> Approve
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
