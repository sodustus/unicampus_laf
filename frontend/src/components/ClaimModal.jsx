import React, { useState } from 'react';
import { submitClaim } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ClaimModal({ report, isOpen, onClose, onClaimSubmitted }) {
  const { token, isAuthenticated } = useAuth();
  const [proofDetails, setProofDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !report) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated) {
      setError('You must be logged in to file an ownership claim.');
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
    <div className="modal-backdrop" onClick={onClose}>
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
            />
            <span className="proof-note">
              🛡️ <strong>Privacy Protection (FR-CLAIM-08):</strong> Your verification details are kept strictly confidential. Only you and reviewing campus administrators can read this proof.
            </span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Filing Claim...' : 'Submit Ownership Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
