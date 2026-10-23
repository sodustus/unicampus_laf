import React, { useState } from 'react';
import { submitFoundNotice } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function FoundNoticeModal({ report, isOpen, onClose, onSuccess }) {
  const { token, isAuthenticated } = useAuth();
  const [possessionStatus, setPossessionStatus] = useState('with_finder');
  const [custodyLocation, setCustodyLocation] = useState('');
  const [foundNotes, setFoundNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !report) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated) {
      setError('You must be logged in to notify the owner.');
      return;
    }

    if (possessionStatus === 'submitted_to_authority' && !custodyLocation.trim()) {
      setError('Please specify where you submitted or handed over the item (e.g. Science Library Desk, Guard Office).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        possession_status: possessionStatus,
        custody_location: possessionStatus === 'submitted_to_authority' ? custodyLocation.trim() : null,
        found_notes: foundNotes.trim() || null,
      };
      const updatedReport = await submitFoundNotice(report.id, payload, token);
      if (onSuccess) onSuccess(updatedReport);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit found notice.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog glass-panel" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">📦</span>
            <div>
              <h3>I Found This Item!</h3>
              <p className="modal-subtitle">
                Notifying owner of lost report: <strong>{report.title}</strong> (#{report.id})
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="claim-item-summary">
          <span>📍 <strong>Reported Lost Near:</strong> {report.location}</span>
          <span>🏷️ <strong>Category:</strong> {report.category?.name || 'General Item'}</span>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Where is the item right now? <span className="req-star">*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: possessionStatus === 'with_finder' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: possessionStatus === 'with_finder' ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="possession_status"
                  value="with_finder"
                  checked={possessionStatus === 'with_finder'}
                  onChange={(e) => setPossessionStatus(e.target.value)}
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <strong style={{ display: 'block', color: '#1e293b' }}>I have physical custody</strong>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    You have the item and will arrange a direct meetup with the owner.
                  </span>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: possessionStatus === 'submitted_to_authority' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: possessionStatus === 'submitted_to_authority' ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="possession_status"
                  value="submitted_to_authority"
                  checked={possessionStatus === 'submitted_to_authority'}
                  onChange={(e) => setPossessionStatus(e.target.value)}
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <strong style={{ display: 'block', color: '#1e293b' }}>I deposited it with campus staff/security</strong>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    You handed it over to a library desk, department office, or campus security post.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {possessionStatus === 'submitted_to_authority' && (
            <div className="form-group" style={{ marginTop: '0.5rem' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Custody Office / Location Details <span className="req-star">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Science Library Front Desk, Guard Office Gate 3"
                value={custodyLocation}
                onChange={(e) => setCustodyLocation(e.target.value)}
                required
              />
              <span className="field-hint">Tell the owner exactly which office or desk they can collect it from.</span>
            </div>
          )}

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
              Notes / Message to the Owner (Optional)
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. Found on the 2nd floor study table. Ready to hand it over anytime after 2 PM."
              value={foundNotes}
              onChange={(e) => setFoundNotes(e.target.value)}
            />
            <span className="field-hint">Helpful meetup instructions or notes about the item's condition.</span>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', margin: '0.75rem 0', fontSize: '0.85rem', color: '#475569' }}>
            🔒 <strong>Coordination Security:</strong> Submitting this notice links your account as the verified finder. Your contact phone numbers will be disclosed to each other to coordinate handover. Only the owner can mark the item as fully recovered once they receive it.
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Notifying Owner...' : '🚀 Submit Found Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
