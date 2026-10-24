import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAllClaims,
  updateClaimStatus,
  completeClaimHandover,
  flagHandoverFailed,
  repostReportAfterFailedHandover,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  IconShield,
  IconAlert,
  IconCheck,
  IconPhone,
  IconUser,
  IconClock,
  IconMapPin,
  IconLock,
} from '../components/Icons';
import ActionDialogModal from '../components/ActionDialogModal';

export default function ClaimsCenterPage({
  embedded = false,
  onOpenReport,
  onViewProfile,
}) {
  const { token } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogConfig, setDialogConfig] = useState(null);

  // Admin action states
  const [rejectingClaimId, setRejectingClaimId] = useState(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');

  const [requestingInfoClaimId, setRequestingInfoClaimId] = useState(null);
  const [requestInfoPromptText, setRequestInfoPromptText] = useState('');

  const [failingHandoverClaimId, setFailingHandoverClaimId] = useState(null);
  const [handoverFailureReason, setHandoverFailureReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const loadClaims = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllClaims(statusFilter === 'all' ? '' : statusFilter, token);
      setClaims(data);
    } catch (err) {
      setError(err.message || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const handleStatusChange = async (claimId, newStatus, reason = null) => {
    setActionLoading(true);
    try {
      await updateClaimStatus(claimId, newStatus, reason, token);
      setRejectingClaimId(null);
      setRejectionReasonText('');
      setRequestingInfoClaimId(null);
      setRequestInfoPromptText('');
      await loadClaims();
    } catch (err) {
      alert(err.message || 'Failed to update claim status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteHandover = (claim) => {
    const claimId = typeof claim === 'object' ? claim.id : claim;
    const isConfirmed = typeof claim === 'object' ? claim.owner_confirmed_receipt : true;

    if (!isConfirmed) {
      setDialogConfig({
        title: 'Awaiting Owner Receipt',
        message: 'The verified owner must confirm physical receipt of their property before administrator completion.',
        confirmLabel: 'Understood',
        confirmVariant: 'warning',
        onConfirm: () => setDialogConfig(null),
      });
      return;
    }

    setDialogConfig({
      title: 'Complete Handover Exchange',
      message: 'Verify and complete item handover? This will mark the report recovered and archive the claim.',
      confirmLabel: 'Complete Handover',
      confirmVariant: 'success',
      onConfirm: async () => {
        setDialogConfig(null);
        setActionLoading(true);
        try {
          await completeClaimHandover(claimId, token);
          await loadClaims();
        } catch (err) {
          alert(err.message || 'Failed to complete handover');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleFlagHandoverFailed = async (claimId) => {
    if (!handoverFailureReason.trim()) {
      alert('Please state why the handover failed (e.g. physical item mismatch, serial number differs).');
      return;
    }
    setActionLoading(true);
    try {
      await flagHandoverFailed(claimId, handoverFailureReason.trim(), token);
      setFailingHandoverClaimId(null);
      setHandoverFailureReason('');
      await loadClaims();
    } catch (err) {
      alert(err.message || 'Failed to report handover failure');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRepostAfterFailure = (reportId) => {
    setDialogConfig({
      title: 'Reactivate Campus Listing',
      message: 'Reactivate this report on the active campus feed to evaluate the next claimant in queue?',
      confirmLabel: 'Reactivate Listing',
      confirmVariant: 'primary',
      onConfirm: async () => {
        setDialogConfig(null);
        setActionLoading(true);
        try {
          await repostReportAfterFailedHandover(reportId, token);
          await loadClaims();
        } catch (err) {
          alert(err.message || 'Failed to repost report');
        } finally {
          setActionLoading(false);
        }
      },
    });
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
        return <span className="badge badge-danger">Handover Failed</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      default:
        return <span className="badge badge-info">{st}</span>;
    }
  };

  return (
    <div className="claims-center-page">
      {/* Header Card (Hidden when embedded inside AdminHub) */}
      {!embedded && (
        <div className="glass-panel claims-header-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-brand-crest" style={{ width: '38px', height: '38px' }}>
              <IconShield size={20} />
            </div>
            <div>
              <h2 className="claims-heading">Campus Claims Verification Desk</h2>
              <p className="claims-subheading">
                Double-blind ownership verification, FCFS priority queue evaluation, and physical item handover authorization.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Status Filter Segmented Bar */}
      <div className="claims-filter-tabs glass-panel" style={{ marginTop: embedded ? '0' : '16px' }}>
        {[
          { id: 'all', label: 'All Records' },
          { id: 'submitted', label: 'Submitted / Queue' },
          { id: 'under_review', label: 'Under Review' },
          { id: 'awaiting_info', label: 'Awaiting Info' },
          { id: 'approved', label: 'Approved Handover' },
          { id: 'completed', label: 'Completed' },
          { id: 'rejected', label: 'Rejected' },
          { id: 'handover_failed', label: 'Handover Failed' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`claims-tab-btn ${statusFilter === tab.id ? 'active' : ''}`}
            onClick={() => setStatusFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert-error" style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Claims Records List */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>
          Loading claims verification desk...
        </div>
      ) : claims.length === 0 ? (
        <div className="glass-panel claims-empty-box" style={{ marginTop: '20px', textAlign: 'center', padding: '48px 24px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>No Claims Found</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {statusFilter !== 'all'
              ? `No claims currently match status '${statusFilter.replace(/_/g, ' ')}'.`
              : 'There are currently no ownership claims in the system.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          {claims.map((c) => {
            const isLostItemMatch = c.report?.type === 'lost';

            return (
              <div
                key={c.id}
                className="glass-panel"
                style={{
                  padding: '24px',
                  border: c.status === 'awaiting_info'
                    ? '1px solid rgba(245, 158, 11, 0.4)'
                    : c.status === 'approved'
                    ? '1px solid rgba(16, 185, 129, 0.4)'
                    : c.status === 'rejected' || c.status === 'handover_failed'
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : '1px solid var(--border-subtle)',
                }}
              >
                {/* Claim Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>
                        {isLostItemMatch ? 'Found Notice #' : 'Claim #'}{c.id}
                      </span>

                      <span
                        className="badge"
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: isLostItemMatch ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: isLostItemMatch ? '#6EE7B7' : '#93C5FD',
                          border: isLostItemMatch ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                          fontWeight: 600,
                        }}
                      >
                        {isLostItemMatch ? 'Flow B: Lost Item Match' : 'Flow A: Found Item Claim'}
                      </span>

                      {c.queue_position && (
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
                          title={c.queue_position === 1 ? 'Priority #1 in queue' : `Position #${c.queue_position} in verification queue`}
                        >
                          {c.queue_position === 1 ? 'Priority #1 in Queue' : `Queue Position #${c.queue_position}`}
                        </span>
                      )}

                      {getStatusBadge(c.status)}
                    </div>

                    <h4 style={{ margin: '8px 0 4px 0', fontSize: '1.15rem', fontWeight: 800 }}>
                      Report #{c.report_id}: {c.report?.title || 'Campus Item'}
                    </h4>

                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <IconMapPin size={13} />
                        <span>{c.report?.location || 'Unknown Location'}</span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <IconClock size={13} />
                        <span>Submitted {new Date(c.created_at).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenReport && onOpenReport(c.report_id)}
                    >
                      Inspect Report #{c.report_id}
                    </button>
                  </div>
                </div>

                {/* DOUBLE-BLIND VERIFICATION COMPARISON BOX (Administrator Desk) */}
                <div
                  style={{
                    margin: '16px 0',
                    padding: '16px',
                    borderRadius: '10px',
                    background: 'rgba(11, 15, 25, 0.85)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IconShield size={18} />
                      <strong style={{ fontSize: '0.92rem', letterSpacing: '0.02em' }}>
                        Double-Blind Verification Comparison
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      (Compare both sides before making an approval or rejection decision)
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    {/* Side A: Report Secret Proof */}
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <IconLock size={14} className="badge-danger" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#F87171', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {isLostItemMatch ? 'Owner Secret Proof (Lost Report)' : 'Report Secret Identifying Details'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.86rem', color: '#F1F5F9', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {c.report?.identifying_details || '(No secret identifying details entered on report)'}
                      </p>
                    </div>

                    {/* Side B: Claimant / Finder Submitted Proof */}
                    <div
                      style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <IconCheck size={14} className="badge-success" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {isLostItemMatch ? 'Finder Blind Custody Proof' : 'Claimant Submitted Ownership Proof'}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.86rem', color: '#F1F5F9', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                        {c.verification_record?.proof_details || '(No proof details provided)'}
                      </p>
                    </div>
                  </div>

                  {/* Additional Proof Clarification Notes */}
                  {c.verification_record?.additional_info && (
                    <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#FCD34D', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Additional Claimant Clarification Note:
                      </span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#F1F5F9' }}>
                        {c.verification_record.additional_info}
                      </p>
                    </div>
                  )}

                  {/* Rejection Note if Rejected */}
                  {c.status === 'rejected' && c.rejection_reason && (
                    <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.12)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <span style={{ fontSize: '0.75rem', color: '#F87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Recorded Rejection Reason:
                      </span>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#FCA5A5' }}>
                        {c.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* ADMIN DIRECT CONTACT & PROFILE VERIFICATION BOX */}
                <div
                  style={{
                    margin: '12px 0',
                    padding: '14px',
                    borderRadius: '8px',
                    background: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#93C5FD', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Direct Party Contact & Campus Verification
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                    {/* Finder Card */}
                    <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '10px 12px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.74rem', color: '#93C5FD', fontWeight: 700 }}>
                        {isLostItemMatch ? 'Finder (Custody Reporter):' : 'Reporter / Founder:'}
                      </span>
                      <div style={{ marginTop: '4px' }}>
                        <strong style={{ color: '#F1F5F9', fontSize: '0.9rem' }}>
                          {c.finder?.full_name || 'Founder'}
                        </strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {c.finder?.department || 'Student'} &bull; {c.finder?.email}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', color: '#6EE7B7', fontWeight: 600 }}>
                            {c.finder?.phone_number || 'No phone recorded'}
                          </span>
                          {c.finder?.phone_number && (
                            <a
                              href={`tel:${c.finder.phone_number}`}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                            >
                              <IconPhone size={11} />
                              <span>Call</span>
                            </a>
                          )}
                          {onViewProfile && c.finder?.id && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                              onClick={() => onViewProfile(c.finder.id)}
                            >
                              <IconUser size={11} />
                              <span>Profile</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Owner / Claimant Card */}
                    <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '10px 12px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.74rem', color: '#6EE7B7', fontWeight: 700 }}>
                        {isLostItemMatch ? 'True Owner (Lost Reporter):' : 'Claimant (Applicant):'}
                      </span>
                      <div style={{ marginTop: '4px' }}>
                        <strong style={{ color: '#F1F5F9', fontSize: '0.9rem' }}>
                          {(c.owner || c.claimant)?.full_name || 'Claimant'}
                        </strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {(c.owner || c.claimant)?.department || 'Student'} &bull; {(c.owner || c.claimant)?.email}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', color: '#6EE7B7', fontWeight: 600 }}>
                            {(c.owner || c.claimant)?.phone_number || 'No phone recorded'}
                          </span>
                          {(c.owner || c.claimant)?.phone_number && (
                            <a
                              href={`tel:${(c.owner || c.claimant).phone_number}`}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                            >
                              <IconPhone size={11} />
                              <span>Call</span>
                            </a>
                          )}
                          {onViewProfile && (c.owner || c.claimant)?.id && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                              onClick={() => onViewProfile((c.owner || c.claimant).id)}
                            >
                              <IconUser size={11} />
                              <span>Profile</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Handover Slip Summary when Approved */}
                {c.status === 'approved' && (
                  <div style={{ margin: '14px 0', padding: '14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ color: '#6EE7B7', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IconCheck size={16} />
                        <span>Handover Approved & Ready for Mutual Receipt</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#CBD5E1', marginTop: '2px' }}>
                        {c.owner_confirmed_receipt ? (
                          <strong style={{ color: '#6EE7B7' }}>Owner confirmed physical receipt! Final verification required.</strong>
                        ) : (
                          <span>Pending physical meetup and owner receipt confirmation.</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={() => handleCompleteHandover(c)}
                        disabled={actionLoading || !c.owner_confirmed_receipt}
                        title={!c.owner_confirmed_receipt ? 'Owner must confirm physical receipt first' : 'Verify and complete item handover'}
                      >
                        {c.owner_confirmed_receipt
                          ? 'Verify & Complete Handover (Owner Confirmed)'
                          : 'Awaiting Owner Receipt Confirmation'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ADMIN ACTION CONTROLS BAR */}
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Step 1: Begin Review */}
                  {c.status === 'submitted' && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStatusChange(c.id, 'under_review')}
                      disabled={actionLoading}
                    >
                      Begin Review
                    </button>
                  )}

                  {/* Step 2: Approve Match or Ownership Claim */}
                  {(c.status === 'submitted' || c.status === 'under_review' || c.status === 'awaiting_info') && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleStatusChange(c.id, 'approved')}
                      disabled={actionLoading}
                    >
                      {isLostItemMatch ? 'Approve Handover Match' : 'Approve Ownership Claim'}
                    </button>
                  )}

                  {/* Step 3: Request More Info */}
                  {(c.status === 'submitted' || c.status === 'under_review') && (
                    requestingInfoClaimId === c.id ? (
                      <div style={{ width: '100%', marginTop: '8px', background: 'rgba(0, 0, 0, 0.3)', padding: '10px', borderRadius: '6px' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ width: '100%', marginBottom: '6px' }}
                          placeholder="What information is needed? (e.g. proof of purchase date, serial number photo)..."
                          value={requestInfoPromptText}
                          onChange={(e) => setRequestInfoPromptText(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setRequestingInfoClaimId(null);
                              setRequestInfoPromptText('');
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-warning btn-sm"
                            onClick={() => handleStatusChange(c.id, 'awaiting_info', requestInfoPromptText.trim())}
                            disabled={actionLoading}
                          >
                            Send Request to Claimant
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        onClick={() => setRequestingInfoClaimId(c.id)}
                        disabled={actionLoading}
                      >
                        Request More Info
                      </button>
                    )
                  )}

                  {/* Step 4: Reject Match or Ownership Claim (Mandatory Reason) */}
                  {c.status !== 'rejected' && c.status !== 'completed' && c.status !== 'handover_failed' && (
                    rejectingClaimId === c.id ? (
                      <div style={{ width: '100%', marginTop: '8px', background: 'rgba(0, 0, 0, 0.3)', padding: '10px', borderRadius: '6px' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ width: '100%', marginBottom: '6px' }}
                          placeholder={isLostItemMatch ? 'Mandatory reason (e.g. Item markings do not match owner secret description)...' : 'Mandatory reason (e.g. Insufficient proof of ownership)...'}
                          value={rejectionReasonText}
                          onChange={(e) => setRejectionReasonText(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setRejectingClaimId(null);
                              setRejectionReasonText('');
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-delete btn-sm"
                            onClick={() => handleStatusChange(c.id, 'rejected', rejectionReasonText.trim())}
                            disabled={actionLoading || !rejectionReasonText.trim()}
                          >
                            {isLostItemMatch ? 'Confirm Reject Match' : 'Confirm Reject Claim'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-delete btn-sm"
                        onClick={() => setRejectingClaimId(c.id)}
                        disabled={actionLoading}
                      >
                        {isLostItemMatch ? 'Reject Match' : 'Reject Ownership Claim'}
                      </button>
                    )
                  )}

                  {/* Flag Mismatch on Approved Handover */}
                  {c.status === 'approved' && (
                    failingHandoverClaimId === c.id ? (
                      <div style={{ width: '100%', marginTop: '8px', background: 'rgba(0, 0, 0, 0.3)', padding: '10px', borderRadius: '6px' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ width: '100%', marginBottom: '6px' }}
                          placeholder="State reason why handover failed (e.g. physical item mismatch)..."
                          value={handoverFailureReason}
                          onChange={(e) => setHandoverFailureReason(e.target.value)}
                        />
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
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
                        onClick={() => setFailingHandoverClaimId(c.id)}
                        disabled={actionLoading}
                      >
                        Flag Handover Mismatch
                      </button>
                    )
                  )}

                  {/* Handover Failure / Reactivate */}
                  {c.status === 'handover_failed' && (
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      onClick={() => handleRepostAfterFailure(c.report_id)}
                      disabled={actionLoading}
                    >
                      Reactivate Report & Evaluate Next Claimant in Queue
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ActionDialogModal
        isOpen={Boolean(dialogConfig)}
        {...dialogConfig}
        onClose={() => setDialogConfig(null)}
      />
    </div>
  );
}
