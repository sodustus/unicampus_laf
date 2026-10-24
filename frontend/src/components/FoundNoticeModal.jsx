import React, { useState } from 'react';
import { submitFoundNotice } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function FoundNoticeModal({ report, isOpen, onClose, onSuccess }) {
  const { token, isAuthenticated } = useAuth();
  const [possessionStatus, setPossessionStatus] = useState('with_finder');
  const [custodyLocation, setCustodyLocation] = useState('');
  const [custodianPhone, setCustodianPhone] = useState('');
  const [allowOwnerDirectContact, setAllowOwnerDirectContact] = useState(false);
  const [founderProof, setFounderProof] = useState('');
  const [foundNotes, setFoundNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !report) return null;

  // Real-time numbers-only filter for custodian phone
  const handleCustodianPhoneChange = (val) => {
    let cleaned = val.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
    } else {
      cleaned = cleaned.replace(/\+/g, '');
    }
    setCustodianPhone(cleaned);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated) {
      setError('You must be logged in to notify the owner.');
      return;
    }

    if (!founderProof.trim() || founderProof.trim().length < 5) {
      setError('Please provide distinguishing proof/hidden details of the item you found (at least 5 characters) so the admin can verify ownership.');
      return;
    }

    if (possessionStatus === 'submitted_to_authority' && !custodyLocation.trim()) {
      setError('Please specify where you submitted or handed over the item (e.g. Science Library Desk, Guard Office).');
      return;
    }

    setSubmitting(true);
    try {
      let finalCustodyLocation = null;
      if (possessionStatus === 'submitted_to_authority') {
        finalCustodyLocation = custodianPhone.trim()
          ? `${custodyLocation.trim()} (Office Tel: ${custodianPhone.trim()})`
          : custodyLocation.trim();
      }

      let finalNotes = foundNotes.trim();
      if (possessionStatus === 'submitted_to_authority' && allowOwnerDirectContact) {
        const contactNote = '📞 Finder Direct Contact: Owner is permitted to call finder personal phone regarding deposit.';
        finalNotes = finalNotes ? `${finalNotes}\n${contactNote}` : contactNote;
      }

      const payload = {
        founder_proof: founderProof.trim(),
        possession_status: possessionStatus,
        custody_location: finalCustodyLocation,
        found_notes: finalNotes || null,
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
                  border: possessionStatus === 'with_finder' ? '2px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: possessionStatus === 'with_finder' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.65)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
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
                  <strong style={{ display: 'block', color: '#F1F5F9' }}>I have physical custody</strong>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
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
                  border: possessionStatus === 'submitted_to_authority' ? '2px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: possessionStatus === 'submitted_to_authority' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.65)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
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
                  <strong style={{ display: 'block', color: '#F1F5F9' }}>I deposited it with campus staff/security</strong>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
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

              {/* Optional Custodian Phone Number */}
              <div style={{ marginTop: '10px' }}>
                <label style={{ fontWeight: 500, fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem', color: '#CBD5E1' }}>
                  📞 Custodian / Office Phone Number <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Optional, numbers only)</span>
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. +251111234567 or 0111234567"
                  value={custodianPhone}
                  onChange={(e) => handleCustodianPhoneChange(e.target.value)}
                  maxLength={16}
                />
                <span className="field-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Helpful so the owner/claimer can call the office desk directly instead of blindly going to an office.
                </span>
              </div>

              {/* Optional Checkbox for Owner to contact finder */}
              <div style={{ marginTop: '10px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    color: '#E2E8F0',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={allowOwnerDirectContact}
                    onChange={(e) => setAllowOwnerDirectContact(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span>
                    <strong>Allow owner to contact me via phone:</strong> Check this if you are comfortable with the owner reaching out to your phone number if they have questions about where you deposited it.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Issue #7: Double-Blind Distinguishing Proof */}
          <div className="form-group" style={{ marginTop: '0.85rem' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem', color: '#F1F5F9' }}>
              Distinguishing Physical Proof / Hidden Marks Observed <span className="req-star">*</span>
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. Has initials 'JD' stamped on the interior corner, brand model XYZ, three brass keys attached, slight scratch on the clasp..."
              value={founderProof}
              onChange={(e) => setFounderProof(e.target.value)}
              required
            />
            <span className="field-hint" style={{ color: '#38BDF8', fontWeight: 500 }}>
              🛡️ Anti-Theft Verification: Campus administrators will compare your description against the owner's confidential proof before authorizing handover.
            </span>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
              Meetup / Handover Availability Note (Optional)
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="e.g. Available around Science Building after 2 PM on weekdays."
              value={foundNotes}
              onChange={(e) => setFoundNotes(e.target.value)}
            />
            <span className="field-hint">Helpful instructions for when the handover is approved.</span>
          </div>

          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '8px', padding: '0.85rem', margin: '0.75rem 0', fontSize: '0.82rem', color: '#E0F2FE' }}>
            🔒 <strong>Double-Blind Security Gate:</strong> Submitting this notice files a verification claim. Neither you nor the owner can see each other's secret proof. An administrator will review and verify that both descriptions match. <strong>Contact phone numbers remain locked until the administrator approves the claim.</strong>
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Notifying Owner...' : '🚀 Submit Found Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
