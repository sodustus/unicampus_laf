import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchMyClaims,
  fetchAllClaims,
  updateClaimStatus,
  respondToClaimInfo,
  completeClaimHandover,
} from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ClaimsManagerModal({ isOpen, onClose, onHandoverCompleted }) {
  const { token, user, isAdmin } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // State for responding to info request (student)
  const [activeRespondId, setActiveRespondId] = useState(null);
  const [additionalInfoText, setAdditionalInfoText] = useState('');

  // State for rejecting claim (admin)
  const [rejectingClaimId, setRejectingClaimId] = useState(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadClaims = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      if (isAdmin) {
        const data = await fetchAllClaims(statusFilter === 'all' ? '' : statusFilter, token);
        setClaims(data);
      } else {
        const data = await fetchMyClaims(token);
        setClaims(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, [token, isAdmin, statusFilter]);

  useEffect(() => {
    if (isOpen) {
      loadClaims();
    }
  }, [isOpen, loadClaims]);

  if (!isOpen) return null;

  // Admin status transition
  const handleStatusChange = async (claimId, newStatus, reason = null) => {
    setActionLoading(true);
    try {
      await updateClaimStatus(claimId, newStatus, reason, token);
      setRejectingClaimId(null);
      setRejectionReasonText('');
      await loadClaims();
    } catch (err) {
      alert(err.message || 'Failed to update claim');
    } finally {
      setActionLoading(false);
    }
  };

  // Student respond with more proof
  const handleSendAdditionalInfo = async (claimId) => {
    if (!additionalInfoText.trim()) return;
    setActionLoading(true);
    try {
      await respondToClaimInfo(claimId, additionalInfoText.trim(), token);
      setActiveRespondId(null);
      setAdditionalInfoText('');
      await loadClaims();
    } catch (err) {
      alert(err.message || 'Failed to submit additional proof');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin confirm handover
  const handleConfirmHandover = async (claimId) => {
    if (!window.confirm('Confirm that the physical item has been returned and handed over to the claimant?')) return;
    setActionLoading(true);
    try {
      await completeClaimHandover(claimId, token);
      await loadClaims();
      if (onHandoverCompleted) onHandoverCompleted();
    } catch (err) {
      alert(err.message || 'Failed to complete handover');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'submitted':
        return <span className="badge badge-info">Submitted</span>;
      case 'under_review':
        return <span className="badge badge-warning">Under Review</span>;
      case 'awaiting_info':
        return <span className="badge badge-danger">Awaiting Information</span>;
      case 'approved':
        return <span className="badge badge-success">Approved</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      case 'completed':
        return <span className="badge badge-success">Completed (Returned)</span>;
      default:
        return <span className="badge badge-info">{st}</span>;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog glass-panel claims-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">{isAdmin ? '🛡️' : '📋'}</span>
            <div>
              <h3>{isAdmin ? 'Campus Claims Review Desk' : 'My Submitted Claims'}</h3>
              <p className="modal-subtitle">
                {isAdmin
                  ? 'Review submitted claims, inspect proof, request additional info, or confirm handovers'
                  : 'Track the status of your claims and respond to administrator requests'}
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Admin Filter Tabs */}
        {isAdmin && (
          <div className="tab-switcher" style={{ overflowX: 'auto' }}>
            {['all', 'submitted', 'under_review', 'awaiting_info', 'approved', 'completed', 'rejected'].map((st) => (
              <button
                key={st}
                className={`tab-btn ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {error && <div className="alert-error">{error}</div>}

        {/* Claims List */}
        <div className="claims-list-wrap">
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading claims...
            </div>
          ) : claims.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              📭 No claims found {statusFilter !== 'all' ? `with status '${statusFilter}'` : ''}.
            </div>
          ) : (
            claims.map((c) => (
              <div key={c.id} className="claim-item-card glass-panel">
                <div className="claim-card-header">
                  <div className="claim-item-title-wrap">
                    <h4>{c.report?.title || `Item #${c.report_id}`}</h4>
                    <span className="claim-id-pill">Claim #{c.id}</span>
                  </div>
                  {getStatusBadge(c.status)}
                </div>

                <div className="claim-meta-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                  <span>🎯 <strong>Claimant:</strong> {c.claimant?.full_name || c.claimant?.email || `User #${c.claimant_id}`} (ID #{c.claimant_id})</span>
                  {c.finder && (
                    <span>📦 <strong>Finder:</strong> {c.finder?.full_name || c.finder?.email || `User #${c.report?.owner_id}`} (ID #{c.report?.owner_id})</span>
                  )}
                  <span>📍 <strong>Location:</strong> {c.report?.location || 'Unknown'}</span>
                  <span>📅 <strong>Submitted:</strong> {new Date(c.created_at).toLocaleDateString()}</span>
                </div>

                {/* Verification Proof Box */}
                <div className="claim-proof-box">
                  <span className="claim-proof-label">🔒 Ownership Verification Proof:</span>
                  <p className="claim-proof-text">
                    {c.verification_record?.proof_details || 'No proof details attached'}
                  </p>

                  {/* Additional Info from claimant (if provided) */}
                  {c.verification_record?.additional_info && (
                    <div className="additional-info-box">
                      <span className="claim-proof-label">💬 Additional Info Provided by Claimant:</span>
                      <p className="claim-proof-text">{c.verification_record.additional_info}</p>
                    </div>
                  )}

                  {/* Rejection Reason (if rejected) */}
                  {c.status === 'rejected' && c.rejection_reason && (
                    <div className="rejection-box">
                      <span className="claim-proof-label" style={{ color: '#F87171' }}>
                        ❌ Rejection Reason:
                      </span>
                      <p className="claim-proof-text">{c.rejection_reason}</p>
                    </div>
                  )}
                </div>

                {/* Issue #2: Official Handover Coordination Slip (Approved & Completed Claims) */}
                {(c.status === 'approved' || c.status === 'completed') && (
                  <div
                    className="handover-slip-card"
                    style={{
                      margin: '14px 0',
                      padding: '16px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.08))',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.3rem' }}>🤝</span>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: '#6EE7B7' }}>
                            Official Handover Coordination Slip
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Admin verified ownership claim #{c.id}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`badge ${c.status === 'completed' ? 'badge-success' : 'badge-info'}`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {c.status === 'completed' ? '✓ HANDOVER COMPLETED' : '✅ APPROVED — COORDINATE PICKUP'}
                      </span>
                    </div>

                    {/* Physical Handover Location */}
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.25)',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Physical Item Custody Location:
                      </span>
                      <p style={{ margin: '4px 0 0 0', fontWeight: 600, color: '#F1F5F9', fontSize: '0.9rem' }}>
                        {c.report?.possession_status === 'submitted_to_authority'
                          ? `🏛️ Deposited at Campus Office: ${c.report?.custody_location || 'Campus Administration'}`
                          : '🤝 Held Directly by Founder (Coordinate Safe Campus Pickup)'}
                      </p>
                    </div>

                    {/* Direct Contact Exchange Box */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Finder Details */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: '#93C5FD', fontWeight: 600 }}>
                          📦 FOUNDER DETAILS
                        </span>
                        <div style={{ marginTop: '6px', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: 600, color: '#F1F5F9' }}>
                            {c.finder?.full_name || 'Founder'}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {c.finder?.department || 'Student'} • {c.finder?.email}
                          </div>
                          {c.finder?.phone_number ? (
                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#6EE7B7', fontWeight: 600 }}>📞 {c.finder.phone_number}</span>
                              <a
                                href={`tel:${c.finder.phone_number}`}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                              >
                                Call
                              </a>
                            </div>
                          ) : (
                            <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              📞 Phone not provided in profile
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Claimant Details */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: '#6EE7B7', fontWeight: 600 }}>
                          🎯 VERIFIED CLAIMANT
                        </span>
                        <div style={{ marginTop: '6px', fontSize: '0.85rem' }}>
                          <div style={{ fontWeight: 600, color: '#F1F5F9' }}>
                            {c.claimant?.full_name || 'Claimant'}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {c.claimant?.department || 'Student'} • {c.claimant?.email}
                          </div>
                          {c.claimant?.phone_number ? (
                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#6EE7B7', fontWeight: 600 }}>📞 {c.claimant.phone_number}</span>
                              <a
                                href={`tel:${c.claimant.phone_number}`}
                                className="btn btn-primary btn-sm"
                                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                              >
                                Call
                              </a>
                            </div>
                          ) : (
                            <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              📞 Phone not provided in profile
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STUDENT ACTION: If status == 'awaiting_info', show response form */}
                {!isAdmin && c.status === 'awaiting_info' && (
                  <div className="student-response-panel">
                    <div className="alert-warning" style={{ margin: '8px 0', padding: '10px 14px', borderRadius: '8px' }}>
                      ⚠️ <strong>Administrator Requested More Information:</strong> Please provide additional proof or details below to verify your ownership.
                    </div>

                    {activeRespondId === c.id ? (
                      <div className="respond-form-box">
                        <textarea
                          className="form-textarea"
                          rows={3}
                          placeholder="Provide receipt info, photo description, serial number..."
                          value={additionalInfoText}
                          onChange={(e) => setAdditionalInfoText(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => { setActiveRespondId(null); setAdditionalInfoText(''); }}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSendAdditionalInfo(c.id)}
                            disabled={actionLoading || !additionalInfoText.trim()}
                          >
                            {actionLoading ? 'Sending...' : 'Submit Additional Proof & Resubmit'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setActiveRespondId(c.id)}
                      >
                        ✍️ Respond to Administrator Request
                      </button>
                    )}
                  </div>
                )}

                {/* ADMIN ACTIONS: State Transitions */}
                {isAdmin && (
                  <div className="admin-actions-bar">
                    {c.status === 'submitted' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleStatusChange(c.id, 'under_review')}
                        disabled={actionLoading}
                      >
                        🔍 Begin Review
                      </button>
                    )}

                    {(c.status === 'under_review' || c.status === 'submitted') && (
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => handleStatusChange(c.id, 'awaiting_info')}
                        disabled={actionLoading}
                      >
                        ❓ Request More Info
                      </button>
                    )}

                    {(c.status === 'under_review' || c.status === 'submitted' || c.status === 'awaiting_info') && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleStatusChange(c.id, 'approved')}
                        disabled={actionLoading}
                      >
                        ✅ Approve Claim
                      </button>
                    )}

                    {c.status !== 'rejected' && c.status !== 'completed' && (
                      rejectingClaimId === c.id ? (
                        <div className="reject-prompt-box">
                          <input
                            type="text"
                            className="form-input-sm"
                            placeholder="Mandatory rejection reason..."
                            value={rejectionReasonText}
                            onChange={(e) => setRejectionReasonText(e.target.value)}
                          />
                          <button
                            className="btn btn-delete btn-sm"
                            onClick={() => handleStatusChange(c.id, 'rejected', rejectionReasonText)}
                            disabled={actionLoading || !rejectionReasonText.trim()}
                          >
                            Confirm Reject
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => { setRejectingClaimId(null); setRejectionReasonText(''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-delete btn-sm"
                          onClick={() => setRejectingClaimId(c.id)}
                          disabled={actionLoading}
                        >
                          ❌ Reject Claim
                        </button>
                      )
                    )}

                    {c.status === 'approved' && (
                      <button
                        className="btn btn-recover btn-sm"
                        onClick={() => handleConfirmHandover(c.id)}
                        disabled={actionLoading}
                      >
                        🤝 Confirm Handover & Complete
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
