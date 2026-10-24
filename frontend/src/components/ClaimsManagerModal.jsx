import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchMyClaims,
  fetchAllClaims,
  updateClaimStatus,
  respondToClaimInfo,
  completeClaimHandover,
  flagHandoverFailed,
  repostReportAfterFailedHandover,
} from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ClaimsManagerModal({ isOpen, onClose, onHandoverCompleted, onOpenClaimReport }) {
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

  // State for flagging handover failed (mismatch)
  const [failingHandoverClaimId, setFailingHandoverClaimId] = useState(null);
  const [handoverFailureReason, setHandoverFailureReason] = useState('');

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

  // Flag handover failed (item mismatch)
  const handleFlagHandoverFailed = async (claimId) => {
    if (!handoverFailureReason.trim()) {
      alert('Please enter a note explaining why the handover failed (e.g. physical item does not match).');
      return;
    }
    setActionLoading(true);
    try {
      const res = await flagHandoverFailed(claimId, handoverFailureReason.trim(), token);
      alert(res.message || 'Handover failure status recorded.');
      setFailingHandoverClaimId(null);
      setHandoverFailureReason('');
      await loadClaims();
      if (onHandoverCompleted) onHandoverCompleted();
    } catch (err) {
      alert(err.message || 'Failed to flag handover failure');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin reactivate & repost report after failed handover
  const handleRepostReport = async (claimId) => {
    if (!window.confirm('Reactivate this report and allow the next claimant in queue to be reviewed?')) return;
    setActionLoading(true);
    try {
      const res = await repostReportAfterFailedHandover(claimId, token);
      alert(res.message || 'Report reactivated successfully.');
      await loadClaims();
      if (onHandoverCompleted) onHandoverCompleted();
    } catch (err) {
      alert(err.message || 'Failed to reactivate report');
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
      case 'handover_failed':
        return <span className="badge badge-danger" style={{ background: 'rgba(239, 68, 68, 0.25)', color: '#FCA5A5' }}>⚠️ Handover Failed</span>;
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
            {['all', 'submitted', 'under_review', 'awaiting_info', 'approved', 'handover_failed', 'completed', 'rejected'].map((st) => (
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
                  <div className="claim-item-title-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4>{c.report?.title || `Item #${c.report_id}`}</h4>
                    <span className="claim-id-pill">Claim #{c.id}</span>
                    {c.queue_position ? (
                      <span
                        className="badge"
                        style={{
                          background: c.queue_position === 1 ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(100, 116, 139, 0.35)',
                          color: '#FFFFFF',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          border: c.queue_position === 1 ? '1px solid #FBBF24' : '1px solid rgba(148, 163, 184, 0.3)',
                        }}
                        title={c.queue_position === 1 ? 'Priority #1 in verification queue' : `Position #${c.queue_position} in verification queue`}
                      >
                        {c.queue_position === 1 ? '👑 Priority #1' : `Queue Position #${c.queue_position}`}
                      </span>
                    ) : null}
                  </div>
                  {getStatusBadge(c.status)}
                </div>

                <div className="claim-meta-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                  <span>
                    {c.report?.type === 'lost' ? '📦 Finder:' : '🎯 Claimant:'}{' '}
                    <strong>{c.claimant?.full_name || c.claimant?.email || `User #${c.claimant_id}`}</strong> (ID #{c.claimant_id})
                  </span>
                  <span>
                    {c.report?.type === 'lost' ? '🔍 Lost by (Owner):' : '📦 Found by (Finder):'}{' '}
                    <strong>{c.finder?.full_name || c.finder?.email || `User #${c.report?.owner_id}`}</strong> (ID #{c.report?.owner_id})
                  </span>
                  <span>📍 <strong>Location:</strong> {c.report?.location || 'Unknown'}</span>
                  <span>📅 <strong>Submitted:</strong> {new Date(c.created_at).toLocaleDateString()}</span>
                </div>

                {/* Double-Blind Verification Proof Box */}
                {isAdmin ? (
                  <div
                    style={{
                      margin: '12px 0',
                      padding: '14px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '1.1rem' }}>⚖️</span>
                      <strong style={{ fontSize: '0.9rem', color: '#38BDF8' }}>
                        Double-Blind Verification Comparison (Administrator Inspection)
                      </strong>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {/* Side A */}
                      <div
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#F87171', display: 'block', marginBottom: '4px' }}>
                          {c.report?.type === 'lost' ? '🔍 OWNER SECRET PROOF (Lost Report)' : '🏷️ REPORT SECRET PROOF'}
                        </span>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>
                          {c.report?.identifying_details || '(No secret identifying details entered on report)'}
                        </p>
                      </div>

                      {/* Side B */}
                      <div
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34D399', display: 'block', marginBottom: '4px' }}>
                          {c.report?.type === 'lost' ? '📦 FINDER BLIND PROOF (Physical Custody)' : '🎯 CLAIMANT OWNERSHIP PROOF'}
                        </span>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#E2E8F0', whiteSpace: 'pre-wrap' }}>
                          {c.verification_record?.proof_details || '(No proof provided)'}
                        </p>
                      </div>
                    </div>

                    {c.verification_record?.additional_info && (
                      <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#CBD5E1' }}>
                        📍 <strong>Custody / Handover Note:</strong> {c.verification_record.additional_info}
                      </div>
                    )}

                    {c.status === 'rejected' && c.rejection_reason && (
                      <div className="rejection-box" style={{ marginTop: '8px' }}>
                        <span className="claim-proof-label" style={{ color: '#F87171' }}>
                          ❌ Rejection Reason:
                        </span>
                        <p className="claim-proof-text">{c.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="claim-proof-box">
                    <span className="claim-proof-label">🔒 Verification Proof Details:</span>
                    <p className="claim-proof-text">
                      {c.verification_record?.proof_details || 'No proof details attached'}
                    </p>

                    {c.verification_record?.additional_info && (
                      <div className="additional-info-box">
                        <span className="claim-proof-label">💬 Additional Info Provided:</span>
                        <p className="claim-proof-text">{c.verification_record.additional_info}</p>
                      </div>
                    )}

                    {c.status === 'rejected' && c.rejection_reason && (
                      <div className="rejection-box">
                        <span className="claim-proof-label" style={{ color: '#F87171' }}>
                          ❌ Rejection Reason:
                        </span>
                        <p className="claim-proof-text">{c.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                )}

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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                        <p style={{ margin: 0, fontWeight: 600, color: '#F1F5F9', fontSize: '0.9rem' }}>
                          {c.report?.possession_status === 'submitted_to_authority'
                            ? `🏛️ Deposited at Campus Office: ${c.report?.custody_location || 'Campus Administration'}`
                            : '🤝 Held Directly by Founder (Coordinate Safe Campus Pickup)'}
                        </p>
                        {c.report?.possession_status === 'submitted_to_authority' && c.report?.custody_location?.match(/(\+?[0-9]{7,15})/) && (
                          <a
                            href={`tel:${c.report.custody_location.match(/(\+?[0-9]{7,15})/)[0]}`}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                            title="Call custodian office desk"
                          >
                            📞 Call Office Desk
                          </a>
                        )}
                      </div>
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

                    {/* Handover Verification & Mismatch Flagging */}
                    {c.status === 'approved' && (
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '10px 12px',
                          background: 'rgba(0, 0, 0, 0.25)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>
                            <strong style={{ color: '#F1F5F9' }}>Physical Inspection Status: </strong>
                            {c.finder_handover_failed && (
                              <span style={{ color: '#FCA5A5', fontWeight: 600 }}>📦 Finder flagged item mismatch • </span>
                            )}
                            {c.claimant_handover_failed && (
                              <span style={{ color: '#FCA5A5', fontWeight: 600 }}>🎯 Claimant flagged item mismatch • </span>
                            )}
                            {!c.finder_handover_failed && !c.claimant_handover_failed ? (
                              <span style={{ color: '#94A3B8' }}>Awaiting safe campus meetup</span>
                            ) : (
                              <span style={{ color: '#FCD34D' }}>Awaiting both parties to confirm failure</span>
                            )}
                          </div>

                          {failingHandoverClaimId === c.id ? (
                            <div style={{ width: '100%', marginTop: '8px' }}>
                              <input
                                type="text"
                                className="form-input-sm"
                                style={{ width: '100%', marginBottom: '6px' }}
                                placeholder="Explain why the handover failed (e.g. item model mismatch, wrong color)..."
                                value={handoverFailureReason}
                                onChange={(e) => setHandoverFailureReason(e.target.value)}
                              />
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    setFailingHandoverClaimId(null);
                                    setHandoverFailureReason('');
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-delete btn-sm"
                                  onClick={() => handleFlagHandoverFailed(c.id)}
                                  disabled={actionLoading || !handoverFailureReason.trim()}
                                >
                                  Confirm Mismatch
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-delete btn-sm"
                              style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                              onClick={() => {
                                setFailingHandoverClaimId(c.id);
                                setHandoverFailureReason('');
                              }}
                            >
                              ⚠️ Report Handover Failed (Item Mismatch)
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Handover Failed Status Banner */}
                {c.status === 'handover_failed' && (
                  <div
                    style={{
                      margin: '14px 0',
                      padding: '14px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F87171', fontWeight: 600 }}>
                      <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                      <span>Handover Aborted: Physical Item Mismatch</span>
                    </div>
                    <p style={{ margin: '6px 0 8px 0', fontSize: '0.85rem', color: '#CBD5E1' }}>
                      Both parties (or administration) confirmed upon physical inspection that this item did not belong to the claimant.
                    </p>
                    {c.handover_failure_notes && (
                      <div style={{ fontSize: '0.8rem', color: '#FCA5A5', background: 'rgba(0, 0, 0, 0.3)', padding: '6px 10px', borderRadius: '4px' }}>
                        <strong>Mismatch Notes:</strong> {c.handover_failure_notes}
                      </div>
                    )}
                    {isAdmin && (
                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          className="btn btn-warning btn-sm"
                          onClick={() => handleRepostReport(c.id)}
                          disabled={actionLoading}
                        >
                          📢 Reactivate Report & Evaluate Next Claimant in Queue
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Rejected Claim Re-submission Action */}
                {!isAdmin && c.status === 'rejected' && c.report && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', color: '#CBD5E1' }}>
                      Claim was rejected. Have stronger or different ownership proof?
                    </span>
                    {onOpenClaimReport && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                        onClick={() => {
                          onClose();
                          onOpenClaimReport(c.report);
                        }}
                      >
                        🔄 Submit New Claim with Better Proof
                      </button>
                    )}
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

                    {c.status !== 'rejected' && c.status !== 'completed' && c.status !== 'handover_failed' && (
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

                    {c.status === 'approved' && c.report?.type !== 'lost' && (
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
