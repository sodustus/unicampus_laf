import React, { useState, useEffect, useCallback } from 'react';
import { fetchMyClaims, respondToClaimInfo } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  IconClaims,
  IconAlert,
  IconClock,
  IconMapPin,
  IconShield,
  IconCheck,
} from '../components/Icons';

export default function MyClaimsPage({
  onOpenReport,
  onNavigateToHandovers,
  onOpenClaimReport,
  onRegisterFoundReport,
}) {
  const { token, user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Inline respond form state
  const [activeRespondId, setActiveRespondId] = useState(null);
  const [additionalText, setAdditionalText] = useState('');
  const [submittingInfo, setSubmittingInfo] = useState(false);

  const loadClaims = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchMyClaims(token, 'filed');
      // Strictly enforce: only claims where user is claimant (found item claimed or lost item claimed to have found)
      const userClaims = (data || []).filter((c) => !user || c.claimant_id === user.id);
      setClaims(userClaims);
    } catch (err) {
      setError(err.message || 'Failed to load your claims');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const handleRespond = async (claimId) => {
    if (!additionalText.trim()) return;
    setSubmittingInfo(true);
    try {
      await respondToClaimInfo(claimId, additionalText.trim(), token);
      setActiveRespondId(null);
      setAdditionalText('');
      await loadClaims();
    } catch (err) {
      alert(err.message || 'Failed to submit additional information');
    } finally {
      setSubmittingInfo(false);
    }
  };

  const filteredClaims = claims.filter((c) => {
    if (statusFilter === 'active') {
      return ['submitted', 'under_review'].includes(c.status);
    }
    if (statusFilter === 'awaiting_info') {
      return c.status === 'awaiting_info';
    }
    if (statusFilter === 'approved') {
      return c.status === 'approved';
    }
    if (statusFilter === 'history') {
      return ['completed', 'rejected', 'handover_failed'].includes(c.status);
    }
    return true;
  });

  const awaitingInfoCount = claims.filter((c) => c.status === 'awaiting_info').length;

  const getStatusBadge = (st) => {
    switch (st) {
      case 'submitted':
        return <span className="badge badge-info">Submitted</span>;
      case 'under_review':
        return <span className="badge badge-warning">Under Review</span>;
      case 'awaiting_info':
        return <span className="badge badge-danger">Action Required</span>;
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
    <div className="my-claims-page">
      {/* Page Header */}
      <div className="glass-panel dashboard-header-card">
        <div className="dashboard-header-meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-brand-crest" style={{ width: '38px', height: '38px' }}>
              <IconClaims size={20} />
            </div>
            <div>
              <h2 className="dashboard-main-title">My Ownership Claims</h2>
              <p className="dashboard-main-subtitle">
                Track verification status, queue priority, and administrator requests for items you filed claims on.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="dashboard-tab-bar" style={{ marginTop: '16px' }}>
        <button
          type="button"
          className={`dashboard-tab ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <span>All Claims ({claims.length})</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab ${statusFilter === 'active' ? 'active' : ''}`}
          onClick={() => setStatusFilter('active')}
        >
          <span>Under Review</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab ${statusFilter === 'awaiting_info' ? 'active' : ''}`}
          onClick={() => setStatusFilter('awaiting_info')}
        >
          <span>Awaiting Information</span>
          {awaitingInfoCount > 0 && (
            <span className="badge badge-danger" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
              {awaitingInfoCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={`dashboard-tab ${statusFilter === 'approved' ? 'active' : ''}`}
          onClick={() => setStatusFilter('approved')}
        >
          <span>Approved</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab ${statusFilter === 'history' ? 'active' : ''}`}
          onClick={() => setStatusFilter('history')}
        >
          <span>Resolved / History</span>
        </button>
      </div>

      {error && (
        <div className="alert-error" style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Claims Grid */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>
          Loading your claims...
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="glass-panel claims-empty-box" style={{ marginTop: '20px', textAlign: 'center', padding: '48px 24px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>No Claims Found</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {statusFilter === 'all'
              ? 'You have not filed any ownership claims on campus items.'
              : `No claims match the filter '${statusFilter}'.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
          {filteredClaims.map((c) => {
            const isLostItemMatch = c.report?.type === 'lost';

            return (
              <div key={c.id} className="glass-panel" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>
                        {isLostItemMatch ? 'Found Notice #' : 'Claim #'}{c.id}
                      </span>
                      {getStatusBadge(c.status)}

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
                        >
                          {c.queue_position === 1 ? 'Priority #1 in Queue' : `Queue Position #${c.queue_position}`}
                        </span>
                      )}
                    </div>

                    <h4 style={{ margin: '8px 0 4px 0', fontSize: '1.1rem', fontWeight: 700 }}>
                      {c.report?.title || `Item #${c.report_id}`}
                    </h4>

                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <IconMapPin size={13} />
                        <span>{c.report?.location || 'Unknown Campus Location'}</span>
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
                      Inspect Report
                    </button>
                  </div>
                </div>

                {/* Submitted Proof Section */}
                <div style={{ marginTop: '14px', background: 'rgba(0, 0, 0, 0.25)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {isLostItemMatch ? 'Finder Custody Observation Proof:' : 'Your Submitted Ownership Proof:'}
                  </span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: '#F1F5F9', whiteSpace: 'pre-wrap' }}>
                    {c.verification_record?.proof_details || '(No details recorded)'}
                  </p>

                  {c.verification_record?.additional_info && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#FCD34D' }}>
                        Additional Proof Provided:
                      </span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#CBD5E1' }}>
                        {c.verification_record.additional_info}
                      </p>
                    </div>
                  )}
                </div>

                {/* ACTION REQUIRED: Admin Requested More Information */}
                {c.status === 'awaiting_info' && (
                  <div style={{ marginTop: '14px', padding: '14px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FCD34D', fontWeight: 700, fontSize: '0.9rem' }}>
                      <IconAlert size={18} />
                      <span>Administrator Requested Additional Information</span>
                    </div>
                    <p style={{ margin: '6px 0 10px 0', fontSize: '0.84rem', color: '#F1F5F9' }}>
                      Please provide clarifying details, serial numbers, purchase receipts, or distinguishing marks to verify ownership.
                    </p>

                    {activeRespondId === c.id ? (
                      <div style={{ marginTop: '10px' }}>
                        <textarea
                          rows="3"
                          className="form-input"
                          placeholder="Provide serial number, distinctive stickers, exact receipt date, or photos..."
                          value={additionalText}
                          onChange={(e) => setAdditionalText(e.target.value)}
                          style={{ width: '100%', marginBottom: '8px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setActiveRespondId(null);
                              setAdditionalText('');
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleRespond(c.id)}
                            disabled={submittingInfo || !additionalText.trim()}
                          >
                            {submittingInfo ? 'Submitting...' : 'Submit Additional Proof'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setActiveRespondId(c.id)}
                      >
                        Respond to Administrator Request
                      </button>
                    )}
                  </div>
                )}

                {/* APPROVED STATUS: Quick Handover Link */}
                {c.status === 'approved' && (
                  <div style={{ marginTop: '14px', padding: '14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6EE7B7', fontWeight: 700, fontSize: '0.9rem' }}>
                        <IconCheck size={18} />
                        <span>Ownership Claim Verified & Approved!</span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#CBD5E1' }}>
                        Official handover coordination slip generated with unmasked contact info.
                      </p>
                    </div>

                    {onNavigateToHandovers && (
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={onNavigateToHandovers}
                      >
                        View Handover Slip & Pickup Info
                      </button>
                    )}
                  </div>
                )}

                {/* REJECTED STATUS: Rejection Reason & Recovery Pipeline */}
                {c.status === 'rejected' && (
                  <div style={{ marginTop: '14px', padding: '14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F87171', fontWeight: 700, fontSize: '0.9rem' }}>
                      <IconAlert size={18} />
                      <span>{isLostItemMatch ? 'Found Notice Rejected (Does Not Match Lost Item)' : 'Claim Rejected by Campus Administration'}</span>
                    </div>

                    {c.rejection_reason && (
                      <div style={{ marginTop: '6px', fontSize: '0.84rem', color: '#FCA5A5', background: 'rgba(0, 0, 0, 0.25)', padding: '8px 12px', borderRadius: '6px' }}>
                        <strong>Administrator Note:</strong> {c.rejection_reason}
                      </div>
                    )}

                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#CBD5E1' }}>
                        {isLostItemMatch
                          ? 'If you have this item in physical custody, register it as a new found item so its true owner can search for it.'
                          : 'If you have stronger proof or believe this was an error, you can try claiming again.'}
                      </span>

                      {/* Flow A Recovery: Try claiming again with better proof */}
                      {!isLostItemMatch && onOpenClaimReport && c.report && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => onOpenClaimReport(c.report)}
                        >
                          Try Claiming Again with Better Proof
                        </button>
                      )}

                      {/* Flow B Recovery: Register as a New Found Item */}
                      {isLostItemMatch && onRegisterFoundReport && c.report && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => onRegisterFoundReport({
                            title: c.report.title,
                            category_id: c.report.category_id,
                            location: c.report.location,
                          })}
                        >
                          Register as a New Found Item
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
