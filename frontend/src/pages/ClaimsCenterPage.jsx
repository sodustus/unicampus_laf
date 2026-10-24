import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchMyClaims,
  fetchAllClaims,
  updateClaimStatus,
  respondToClaimInfo,
  completeClaimHandover,
  confirmClaimReceipt,
  flagHandoverFailed,
  repostReportAfterFailedHandover,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { IconAlert } from '../components/Icons';

export default function ClaimsCenterPage({
  embedded = false,
  onOpenReport,
  _onViewProfile,
}) {
  const { token, user, isAdmin } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [activeRespondId, setActiveRespondId] = useState(null);
  const [additionalInfoText, setAdditionalInfoText] = useState('');

  const [rejectingClaimId, setRejectingClaimId] = useState(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

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
    loadClaims();
  }, [loadClaims]);

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

  const handleCompleteHandover = async (claimId) => {
    if (!window.confirm('Confirm that you have physically returned this item to the verified claimant?')) return;
    setActionLoading(true);
    try {
      await completeClaimHandover(claimId, token);
      await loadClaims();
    } catch (err) {
      alert(err.message || 'Failed to complete handover');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceipt = async (claimId) => {
    if (!window.confirm('Confirm that you have physically received your item back in good condition?')) return;
    setActionLoading(true);
    try {
      await confirmClaimReceipt(claimId, token);
      await loadClaims();
    } catch (err) {
      alert(err.message || 'Failed to confirm receipt');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFlagHandoverFailed = async (claimId) => {
    if (!handoverFailureReason.trim()) {
      alert('Please state why the handover failed (e.g. claimant could not unlock device).');
      return;
    }
    setActionLoading(true);
    try {
      await flagHandoverFailed(claimId, handoverFailureReason.trim(), token);
      setFailingHandoverClaimId(null);
      setHandoverFailureReason('');
      await loadClaims();
    } catch (err) {
      alert(err.message || 'Failed to flag handover');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRepostAfterFailure = async (reportId) => {
    if (!window.confirm('Repost this item to the active campus feed so another claimant can be verified?')) return;
    setActionLoading(true);
    try {
      await repostReportAfterFailedHandover(reportId, token);
      await loadClaims();
    } catch (err) {
      alert(err.message || 'Failed to repost report');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="claims-center-page">
      {/* Page Header (Omitted when embedded inside AdminHub) */}
      {!embedded && (
        <div className="glass-panel claims-header-card">
          <div>
            <h2 className="claims-heading">
              {isAdmin ? 'Claims Verification & Oversight Desk' : 'Claims & Handover Center'}
            </h2>
            <p className="claims-subheading">
              {isAdmin
                ? 'Double-blind ownership verification, priority queue ordering, and dispute management.'
                : 'Track ownership claims, verification queue status, and coordinate safe campus handovers.'}
            </p>
          </div>
        </div>
      )}

      {/* Filter Tabs for Admin */}
      {isAdmin && (
        <div className="claims-filter-tabs glass-panel" style={{ marginTop: '16px' }}>
          {[
            { id: 'all', label: 'All Claims' },
            { id: 'submitted', label: 'Submitted / Queue' },
            { id: 'more_info_needed', label: 'Awaiting Info' },
            { id: 'approved', label: 'Approved Handover' },
            { id: 'completed', label: 'Completed' },
            { id: 'rejected', label: 'Rejected' },
            { id: 'handover_failed', label: 'Handover Failed' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`claims-tab-btn ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="alert-error" style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Claims Content List */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>
          Loading claims directory...
        </div>
      ) : claims.length === 0 ? (
        <div className="glass-panel claims-empty-box" style={{ marginTop: '20px' }}>
          <h4>No claims found</h4>
          <p>
            {isAdmin
              ? 'No student claims currently match the selected status filter.'
              : 'You have not submitted or received any claims yet.'}
          </p>
        </div>
      ) : (
        <div className="claims-grid" style={{ marginTop: '20px' }}>
          {claims.map((claim) => {
            const isClaimant = user && user.id === claim.claimer_id;
            const isFounder = user && claim.report && user.id === claim.report.founder_id;

            return (
              <div key={claim.id} className="claim-card glass-panel">
                <div className="claim-card-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="badge badge-info">Claim #{claim.id}</span>
                      <span
                        className={`badge ${
                          claim.status === 'approved'
                            ? 'badge-success'
                            : claim.status === 'rejected'
                            ? 'badge-danger'
                            : claim.status === 'more_info_needed'
                            ? 'badge-warning'
                            : 'badge-info'
                        }`}
                      >
                        {claim.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      {claim.queue_position && (
                        <span className="badge badge-info" style={{ fontWeight: 700 }}>
                          Queue: #{claim.queue_position}
                        </span>
                      )}
                    </div>
                    <h4 style={{ marginTop: '8px', fontSize: '1.05rem', fontWeight: 700 }}>
                      Report #{claim.report_id}: {claim.report?.title || 'Campus Item'}
                    </h4>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onOpenReport(claim.report_id)}
                  >
                    View Report
                  </button>
                </div>

                <div className="claim-card-body">
                  <div className="claim-info-block">
                    <strong>Submitted Ownership Proof:</strong>
                    <p style={{ marginTop: '4px', color: 'var(--text-muted)' }}>{claim.ownership_proof}</p>
                  </div>

                  {isAdmin && claim.report?.secret_verification_details && (
                    <div className="claim-secret-block" style={{ marginTop: '10px', background: 'rgba(99,102,241,0.08)', padding: '10px', borderRadius: '6px' }}>
                      <strong style={{ color: '#a5b4fc' }}>Finder's Secret Verification Detail (Double-Blind Reference):</strong>
                      <p style={{ marginTop: '4px', color: 'var(--text-muted)' }}>{claim.report.secret_verification_details}</p>
                    </div>
                  )}

                  {claim.admin_notes && (
                    <div style={{ marginTop: '10px', background: 'rgba(245,158,11,0.08)', padding: '10px', borderRadius: '6px' }}>
                      <strong style={{ color: '#fcd34d' }}>Administrator Notes:</strong>
                      <p style={{ marginTop: '4px', color: 'var(--text-muted)' }}>{claim.admin_notes}</p>
                    </div>
                  )}

                  {/* Handover Slip when Approved */}
                  {claim.status === 'approved' && claim.handover_slip && (
                    <div className="handover-slip-card" style={{ marginTop: '14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', padding: '14px', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 800, color: '#34d399', fontSize: '0.88rem' }}>
                        VERIFIED MUTUAL HANDOVER SLIP
                      </div>
                      <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.82rem' }}>
                        <div><strong>Code:</strong> {claim.handover_slip.verification_code}</div>
                        <div><strong>Slip ID:</strong> #{claim.handover_slip.slip_id}</div>
                        <div><strong>Location:</strong> {claim.handover_slip.handover_location}</div>
                        <div><strong>Date:</strong> {new Date(claim.handover_slip.generated_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Bar */}
                <div className="claim-card-footer" style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Admin controls */}
                  {isAdmin && (
                    <>
                      {claim.status === 'submitted' && (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={actionLoading}
                            onClick={() => handleStatusChange(claim.id, 'approved')}
                          >
                            Approve Claim
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={actionLoading}
                            onClick={() => handleStatusChange(claim.id, 'more_info_needed')}
                          >
                            Request More Info
                          </button>
                          <button
                            className="btn btn-delete btn-sm"
                            disabled={actionLoading}
                            onClick={() => setRejectingClaimId(claim.id)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {rejectingClaimId === claim.id && (
                        <div style={{ width: '100%', marginTop: '8px' }}>
                          <textarea
                            rows="2"
                            className="form-input"
                            placeholder="State mandatory reason for claim rejection..."
                            value={rejectionReasonText}
                            onChange={(e) => setRejectionReasonText(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                            <button
                              className="btn btn-delete btn-sm"
                              disabled={actionLoading || !rejectionReasonText.trim()}
                              onClick={() => handleStatusChange(claim.id, 'rejected', rejectionReasonText.trim())}
                            >
                              Confirm Rejection
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => { setRejectingClaimId(null); setRejectionReasonText(''); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Student responding to info */}
                  {isClaimant && claim.status === 'more_info_needed' && (
                    <div style={{ width: '100%' }}>
                      {activeRespondId === claim.id ? (
                        <div>
                          <textarea
                            rows="2"
                            className="form-input"
                            placeholder="Provide requested additional ownership details..."
                            value={additionalInfoText}
                            onChange={(e) => setAdditionalInfoText(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              disabled={actionLoading || !additionalInfoText.trim()}
                              onClick={() => handleSendAdditionalInfo(claim.id)}
                            >
                              Send Info
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setActiveRespondId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => setActiveRespondId(claim.id)}
                        >
                          Respond to Verification Desk
                        </button>
                      )}
                    </div>
                  )}

                  {/* Finder completes handover */}
                  {isFounder && claim.status === 'approved' && !claim.handover_completed && (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={actionLoading}
                      onClick={() => handleCompleteHandover(claim.id)}
                    >
                      Confirm Physical Handover to Claimant
                    </button>
                  )}

                  {/* Claimant confirms receipt */}
                  {isClaimant && claim.status === 'approved' && !claim.receipt_confirmed && (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={actionLoading}
                      onClick={() => handleConfirmReceipt(claim.id)}
                    >
                      Confirm Received Item Back
                    </button>
                  )}

                  {/* Dispute / Mismatch */}
                  {claim.status === 'approved' && !claim.handover_completed && (isFounder || isClaimant) && (
                    <>
                      {failingHandoverClaimId === claim.id ? (
                        <div style={{ width: '100%', marginTop: '8px' }}>
                          <textarea
                            rows="2"
                            className="form-input"
                            placeholder="State reason for handover failure (e.g. claimant could not unlock phone)..."
                            value={handoverFailureReason}
                            onChange={(e) => setHandoverFailureReason(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                            <button
                              className="btn btn-delete btn-sm"
                              disabled={actionLoading}
                              onClick={() => handleFlagHandoverFailed(claim.id)}
                            >
                              Confirm Handover Mismatch
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => { setFailingHandoverClaimId(null); setHandoverFailureReason(''); }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn btn-delete btn-sm"
                          onClick={() => setFailingHandoverClaimId(claim.id)}
                        >
                          Report Handover Mismatch / Failure
                        </button>
                      )}
                    </>
                  )}

                  {/* Repost after failed handover */}
                  {claim.status === 'handover_failed' && (isFounder || isAdmin) && (
                    <button
                      className="btn btn-warning btn-sm"
                      disabled={actionLoading}
                      onClick={() => handleRepostAfterFailure(claim.report_id)}
                    >
                      Repost Item for Next Claimant
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
