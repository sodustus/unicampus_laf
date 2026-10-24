import React, { useState } from 'react';
import { submitClaim } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ClaimModal({ report, isOpen, onClose, onClaimSubmitted }) {
  const { user, token, isAuthenticated } = useAuth();
  const [proofDetails, setProofDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !report) return null;

  const isReporter = Boolean(user && report && (user.id === report.owner_id || user.id === report.founder_id));
  const hasActiveClaim = Boolean(report && report.user_has_claimed);
  const wasRejected = Boolean(report && report.user_claim_status === 'rejected');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated) {
      setError('You must be logged in to file an ownership claim.');
      return;
    }

    if (isReporter) {
      setError('A user cannot be both the reporter and claimer on the same report.');
      return;
    }

    if (hasActiveClaim) {
      setError('You already have an ownership claim currently being processed for this item. You cannot submit multiple claims while your claim is under review.');
      return;
    }

    setSubmitting(true);
    try {
      const claim = await submitClaim(report.id, proofDetails.trim(), token);
      onClaimSubmitted(claim);
      onClose();
      setProofDetails('');
    } catch (err) {
      setError(err.message || 'Failed to submit claim.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog glass-panel" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">🤝</span>
            <div>
              <h3>Claim Ownership of Found Item</h3>
              <p className="modal-subtitle">
                Claiming: <strong>{report.title}</strong> (#{report.id})
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="claim-item-summary">
          <span>📍 <strong>Location:</strong> {report.location}</span>
          <span>🏷️ <strong>Category:</strong> {report.category?.name || 'General Item'}</span>
        </div>

        {isReporter && (
          <div className="alert-error" style={{ margin: '12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚫</span>
            <span>
              <strong>Rule Enforced:</strong> You are the reporter of this item. A user cannot be both the reporter and claimer on the same report.
            </span>
          </div>
        )}

        {hasActiveClaim && (
          <div className="alert-error" style={{ margin: '12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⏳</span>
            <span>
              <strong>Claim In Progress:</strong> You already have an ownership claim currently being processed for this item. You cannot claim an item twice while your claim is under review.
            </span>
          </div>
        )}

        {!hasActiveClaim && wasRejected && (
          <div style={{ margin: '12px 0', padding: '12px 14px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>💡</span>
            <span style={{ fontSize: '0.85rem', color: '#E2E8F0', lineHeight: 1.4 }}>
              <strong>Previous Claim Was Rejected:</strong> If you think this was a mistake or you have stronger proof of ownership, you can submit a new claim. Please provide specific, distinguishing details (serial number, scratches, contents) to help administrators verify your ownership.
            </span>
          </div>
        )}

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group proof-field-group">
            <div className="proof-label-wrap">
              <label htmlFor="claim-proof">
                🔒 Ownership Verification Details (FR-CLAIM-02) *
              </label>
              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>RESTRICTED</span>
            </div>
            <textarea
              id="claim-proof"
              className="form-textarea"
              rows={4}
              placeholder="Provide specific proof of ownership, such as:&#10;• Serial numbers, IMEI, or model numbers&#10;• Unique scratches, dents, or stickers&#10;• What is stored inside (if wallet, bag, or binder)&#10;• Lock-screen wallpaper or custom passcode details"
              value={proofDetails}
              onChange={(e) => setProofDetails(e.target.value)}
              required
              minLength={5}
              disabled={isReporter || hasActiveClaim}
            />
            <span className="proof-note">
              🛡️ <strong>Privacy Protection (FR-CLAIM-08):</strong> Your verification details are kept strictly confidential. Only you and reviewing campus administrators can read this proof.
            </span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || isReporter || hasActiveClaim}>
              {submitting ? 'Filing Claim...' : 'Submit Ownership Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
