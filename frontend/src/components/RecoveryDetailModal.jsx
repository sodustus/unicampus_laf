import React, { useEffect, useState } from 'react';
import { fetchRecoveryRecord, markDirectRecovery } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { IconCheck, IconClose, IconClock, IconShield } from './Icons';

export default function RecoveryDetailModal({ report, isOpen, onClose, onRecovered }) {
  const { token } = useAuth();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isRecovered = report && report.status === 'recovered';

  useEffect(() => {
    if (!isOpen || !report) return;
    setError('');

    if (isRecovered) {
      setLoading(true);
      fetchRecoveryRecord(report.id, token)
        .then((data) => {
          setRecord(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load recovery details.');
          setLoading(false);
        });
    } else {
      setLoading(false);
      setRecord(null);
    }
  }, [isOpen, report, isRecovered, token]);

  if (!isOpen || !report) return null;

  const handleDirectRecoverySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await markDirectRecovery(report.id, handoverNotes.trim(), token);
      if (onRecovered) onRecovered(report.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to mark report as recovered.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog glass-panel" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge">
              <IconCheck size={18} />
            </div>
            <div>
              <h3>{isRecovered ? 'Recovery Record & Verification' : 'Confirm Item Recovery'}</h3>
              <p className="modal-subtitle">Report: <strong>{report.title}</strong> (#{report.id})</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        {error && <div className="alert-error" style={{ margin: '12px 0' }}>{error}</div>}

        {isRecovered ? (
          loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading recovery audit record...
            </div>
          ) : record ? (
            <div className="recovery-receipt-card">
              <div className="recovery-badge-row">
                <span className="badge badge-success">RECOVERY CONFIRMED</span>
                <span className="recovery-timestamp" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <IconClock size={13} /> {new Date(record.recovered_at).toLocaleString()}
                </span>
              </div>

              <div className="detail-meta-grid" style={{ margin: '16px 0' }}>
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Responsible User ID</span>
                  <span className="detail-meta-value">#{record.responsible_user_id}</span>
                </div>
                <div className="detail-meta-item">
                  <span className="detail-meta-label">Claim Reference</span>
                  <span className="detail-meta-value">
                    {record.claim_id ? `Claim #${record.claim_id}` : 'Direct Owner Recovery'}
                  </span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Handover Summary / Audit Notes</h4>
                <p className="recovery-notes-text">
                  {record.handover_notes || 'Item marked as successfully recovered and returned to owner.'}
                </p>
              </div>

              <div className="audit-proof-notice" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconShield size={14} /> Immutable Audit Entry recorded under FR-RECOVER-01 & FR-AUDIT-01.
              </div>

              <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No formal recovery record found for this item.
            </div>
          )
        ) : (
          /* Direct recovery form for owner */
          <form onSubmit={handleDirectRecoverySubmit} className="auth-form">
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Confirm that this item has been safely recovered and returned. This will transition the report to
              <strong> Recovered</strong>, remove it from active search listings, and create an immutable recovery audit record (FR-RECOVER-01).
            </p>

            <div className="form-group" style={{ marginTop: '14px' }}>
              <label htmlFor="handover-notes">Recovery Notes / Handover Location (Optional):</label>
              <textarea
                id="handover-notes"
                rows="3"
                className="form-input"
                placeholder="e.g. Found inside my locker / Handed over at Student Union Desk"
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
              />
            </div>

            <div className="modal-actions" style={{ marginTop: '16px', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Confirming...' : 'Confirm Recovery'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
