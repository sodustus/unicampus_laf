import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchMyClaims,
  fetchAllClaims,
  confirmClaimReceipt,
  completeClaimHandover,
  flagHandoverFailed,
  repostReportAfterFailedHandover,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  IconHandover,
  IconAlert,
  IconCheck,
  IconPhone,
  IconMapPin,
  IconClock,
  IconUser,
} from '../components/Icons';
import ActionDialogModal from '../components/ActionDialogModal';

export default function HandoversPage({
  onOpenReport,
  onViewProfile,
}) {
  const { token, user, isAdmin } = useAuth();
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'completed' | 'failed' | 'all'

  const [failingHandoverId, setFailingHandoverId] = useState(null);
  const [mismatchReason, setMismatchReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogConfig, setDialogConfig] = useState(null);

  const loadHandovers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      let data = [];
      if (isAdmin) {
        data = await fetchAllClaims('', token);
      } else {
        data = await fetchMyClaims(token, 'all');
      }
      // Handovers include approved, completed, and handover_failed claims
      const relevant = data.filter((c) =>
        ['approved', 'completed', 'handover_failed'].includes(c.status)
      );
      setHandovers(relevant);
    } catch (err) {
      setError(err.message || 'Failed to load handovers');
    } finally {
      setLoading(false);
    }
  }, [token, isAdmin]);

  useEffect(() => {
    loadHandovers();
  }, [loadHandovers]);

  const handleConfirmReceipt = (claimId) => {
    setDialogConfig({
      title: 'Confirm Physical Receipt',
      message: 'Are you sure you have physically met and received your item back in good condition?',
      confirmLabel: 'Confirm Receipt',
      confirmVariant: 'success',
      onConfirm: async () => {
        setDialogConfig(null);
        setActionLoading(true);
        try {
          await confirmClaimReceipt(claimId, token);
          await loadHandovers();
        } catch (err) {
          alert(err.message || 'Failed to confirm receipt');
        } finally {
          setActionLoading(false);
        }
      },
    });
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
      message: 'Verify and complete this item handover? This will mark the report as recovered and archive the claim.',
      confirmLabel: 'Complete Handover',
      confirmVariant: 'success',
      onConfirm: async () => {
        setDialogConfig(null);
        setActionLoading(true);
        try {
          await completeClaimHandover(claimId, token);
          await loadHandovers();
        } catch (err) {
          alert(err.message || 'Failed to complete handover');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleFlagMismatch = async (claimId) => {
    if (!mismatchReason.trim()) return;
    setActionLoading(true);
    try {
      await flagHandoverFailed(claimId, mismatchReason.trim(), token);
      setFailingHandoverId(null);
      setMismatchReason('');
      await loadHandovers();
    } catch (err) {
      alert(err.message || 'Failed to report item mismatch');
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
          await loadHandovers();
        } catch (err) {
          alert(err.message || 'Failed to reactivate report');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const filteredHandovers = handovers.filter((c) => {
    if (statusFilter === 'active') return c.status === 'approved';
    if (statusFilter === 'completed') return c.status === 'completed';
    if (statusFilter === 'failed') return c.status === 'handover_failed';
    return true;
  });

  const activeCount = handovers.filter((c) => c.status === 'approved').length;
  const completedCount = handovers.filter((c) => c.status === 'completed').length;
  const failedCount = handovers.filter((c) => c.status === 'handover_failed').length;

  return (
    <div className="handovers-page">
      {/* Page Header */}
      <div className="glass-panel dashboard-header-card">
        <div className="dashboard-header-meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-brand-crest" style={{ width: '38px', height: '38px' }}>
              <IconHandover size={20} />
            </div>
            <div>
              <h2 className="dashboard-main-title">Official Handover Slips & Coordination</h2>
              <p className="dashboard-main-subtitle">
                Mutual verification slips, physical custody locations, and unmasked campus contact details.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="dashboard-tab-bar" style={{ marginTop: '16px' }}>
        <button
          type="button"
          className={`dashboard-tab ${statusFilter === 'active' ? 'active' : ''}`}
          onClick={() => setStatusFilter('active')}
        >
          <span>Active Handovers ({activeCount})</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab ${statusFilter === 'completed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('completed')}
        >
          <span>Completed History ({completedCount})</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab ${statusFilter === 'failed' ? 'active' : ''}`}
          onClick={() => setStatusFilter('failed')}
        >
          <span>Disputed / Failed ({failedCount})</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <span>All Records ({handovers.length})</span>
        </button>
      </div>

      {error && (
        <div className="alert-error" style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Handover Cards List */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>
          Loading handover slips...
        </div>
      ) : filteredHandovers.length === 0 ? (
        <div className="glass-panel claims-empty-box" style={{ marginTop: '20px', textAlign: 'center', padding: '48px 24px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>No Handover Slips Found</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {statusFilter === 'active'
              ? 'You do not have any active approved handovers awaiting pickup or receipt.'
              : `No handover slips match the filter '${statusFilter}'.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          {filteredHandovers.map((c) => {
            const isOwner = user && (c.owner?.id === user.id || (!c.owner && (c.report?.type === 'lost' ? c.report?.owner_id === user.id : c.claimant_id === user.id)));
            const isFinder = user && (c.finder?.id === user.id || (!c.finder && (c.report?.type === 'lost' ? c.claimant_id === user.id : (c.report?.founder_id === user.id || c.report?.owner_id === user.id))));
            const isReporter = user && c.report?.owner_id === user.id;

            return (
              <div
                key={c.id}
                className="glass-panel"
                style={{
                  padding: '24px',
                  border: c.status === 'completed'
                    ? '1px solid rgba(16, 185, 129, 0.4)'
                    : c.status === 'handover_failed'
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : '1px solid rgba(59, 130, 246, 0.4)',
                }}
              >
                {/* Handover Slip Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="badge badge-info" style={{ fontWeight: 700 }}>
                        Slip #SLIP-{c.id}
                      </span>
                      <span
                        className={`badge ${
                          c.status === 'completed'
                            ? 'badge-success'
                            : c.status === 'handover_failed'
                            ? 'badge-danger'
                            : 'badge-success'
                        }`}
                        style={{ fontWeight: 700 }}
                      >
                        {c.status === 'completed'
                          ? 'HANDOVER COMPLETED'
                          : c.status === 'handover_failed'
                          ? 'HANDOVER FAILED'
                          : 'APPROVED: COORDINATE PICKUP'}
                      </span>
                    </div>

                    <h4 style={{ margin: '8px 0 4px 0', fontSize: '1.2rem', fontWeight: 800 }}>
                      {c.report?.title || `Item #${c.report_id}`}
                    </h4>

                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <IconClock size={13} />
                        <span>Slip Approved: {new Date(c.updated_at || c.created_at).toLocaleDateString()}</span>
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <IconMapPin size={13} />
                        <span>Report Location: {c.report?.location || 'Campus'}</span>
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenReport && onOpenReport(c.report_id)}
                    >
                      Inspect Item Report
                    </button>
                  </div>
                </div>

                {/* Custody Location Banner */}
                <div style={{ margin: '14px 0', background: 'rgba(0, 0, 0, 0.3)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    Physical Item Custody Location:
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#F1F5F9', fontSize: '0.92rem' }}>
                      {c.report?.possession_status === 'submitted_to_authority'
                        ? `Deposited at Campus Office: ${c.report?.custody_location || 'Campus Administration Security Desk'}`
                        : 'Held Directly by Finder (Coordinate Safe Campus Pickup)'}
                    </p>

                    {c.report?.possession_status === 'submitted_to_authority' && c.report?.custody_location?.match(/(\+?[0-9]{7,15})/) && (
                      <a
                        href={`tel:${c.report.custody_location.match(/(\+?[0-9]{7,15})/)[0]}`}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        <IconPhone size={13} />
                        <span>Call Office Desk</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Unmasked Contact Cards (Finder & Owner) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', margin: '14px 0' }}>
                  {/* Finder Details */}
                  <div style={{ background: 'rgba(59, 130, 246, 0.06)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <span style={{ fontSize: '0.74rem', color: '#93C5FD', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Founder / Custodian Details
                    </span>
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F1F5F9' }}>
                        {c.finder?.full_name || 'Founder'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
                        {c.finder?.department || 'Student'} &bull; {c.finder?.email}
                      </div>

                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {c.finder?.phone_number ? (
                          <>
                            <span style={{ color: '#6EE7B7', fontWeight: 700, fontSize: '0.85rem' }}>
                              {c.finder.phone_number}
                            </span>
                            <a
                              href={`tel:${c.finder.phone_number}`}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                            >
                              <IconPhone size={12} />
                              <span>Call</span>
                            </a>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Phone not provided in profile
                          </span>
                        )}

                        {onViewProfile && c.finder?.id && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                            onClick={() => onViewProfile(c.finder.id)}
                          >
                            <IconUser size={12} />
                            <span>Profile</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Owner / Claimant Details */}
                  <div style={{ background: 'rgba(16, 185, 129, 0.06)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <span style={{ fontSize: '0.74rem', color: '#6EE7B7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Verified True Owner Details
                    </span>
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F1F5F9' }}>
                        {(c.owner || c.claimant)?.full_name || 'Owner'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
                        {(c.owner || c.claimant)?.department || 'Student'} &bull; {(c.owner || c.claimant)?.email}
                      </div>

                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {(c.owner || c.claimant)?.phone_number ? (
                          <>
                            <span style={{ color: '#6EE7B7', fontWeight: 700, fontSize: '0.85rem' }}>
                              {(c.owner || c.claimant).phone_number}
                            </span>
                            <a
                              href={`tel:${(c.owner || c.claimant).phone_number}`}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                            >
                              <IconPhone size={12} />
                              <span>Call</span>
                            </a>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Phone not provided in profile
                          </span>
                        )}

                        {onViewProfile && (c.owner || c.claimant)?.id && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                            onClick={() => onViewProfile((c.owner || c.claimant).id)}
                          >
                            <IconUser size={12} />
                            <span>Profile</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Two-Step Handover Receipt & Completion Actions */}
                {c.status === 'approved' && (
                  <div style={{ marginTop: '14px', padding: '14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      {c.owner_confirmed_receipt ? (
                        <span style={{ color: '#6EE7B7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
                          <IconCheck size={16} />
                          <span>Physical Item Receipt Confirmed by Owner! Awaiting Administrator final verification.</span>
                        </span>
                      ) : (
                        <span style={{ color: '#FCD34D', fontWeight: 600, fontSize: '0.86rem' }}>
                          Pending Physical Pickup: Owner must meet, inspect item, and confirm receipt.
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Finder guidance */}
                      {isFinder && !isOwner && !isAdmin && (
                        <span style={{ fontSize: '0.78rem', color: '#93C5FD', padding: '4px 8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px' }}>
                          Item in your physical custody &bull; Awaiting owner pickup
                        </span>
                      )}

                      {/* Owner confirm receipt action */}
                      {!c.owner_confirmed_receipt && isOwner && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleConfirmReceipt(c.id)}
                          disabled={actionLoading}
                        >
                          <IconCheck size={14} />
                          <span>Confirm I Have Received My Item</span>
                        </button>
                      )}

                      {/* Admin final verify & complete */}
                      {isAdmin && (
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => handleCompleteHandover(c)}
                          disabled={actionLoading || !c.owner_confirmed_receipt}
                          title={!c.owner_confirmed_receipt ? 'Owner must confirm receipt first' : 'Verify & Complete Handover'}
                        >
                          {c.owner_confirmed_receipt
                            ? 'Verify & Complete Handover (Owner Confirmed)'
                            : 'Awaiting Owner Receipt Confirmation'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Handover Mismatch Flagging Section */}
                {c.status === 'approved' && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        In-person physical inspection status:
                        {c.finder_handover_failed && <strong style={{ color: '#F87171' }}> Finder flagged mismatch. </strong>}
                        {c.claimant_handover_failed && <strong style={{ color: '#F87171' }}> Claimant flagged mismatch. </strong>}
                        {!c.finder_handover_failed && !c.claimant_handover_failed && <span> Awaiting meetup.</span>}
                      </span>

                      {failingHandoverId === c.id ? (
                        <div style={{ width: '100%', marginTop: '8px' }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ width: '100%', marginBottom: '6px' }}
                            placeholder="Explain why the handover failed (e.g. item model mismatch, wrong color)..."
                            value={mismatchReason}
                            onChange={(e) => setMismatchReason(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setFailingHandoverId(null);
                                setMismatchReason('');
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-delete btn-sm"
                              onClick={() => handleFlagMismatch(c.id)}
                              disabled={actionLoading || !mismatchReason.trim()}
                            >
                              Confirm Mismatch
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-delete btn-sm"
                          style={{ fontSize: '0.74rem' }}
                          onClick={() => {
                            setFailingHandoverId(c.id);
                            setMismatchReason('');
                          }}
                        >
                          Report Handover Failed (Item Mismatch)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Handover Failed Status Banner */}
                {c.status === 'handover_failed' && (
                  <div style={{ marginTop: '14px', padding: '14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F87171', fontWeight: 700 }}>
                      <IconAlert size={18} />
                      <span>Handover Aborted: Physical Item Mismatch</span>
                    </div>
                    <p style={{ margin: '6px 0 8px 0', fontSize: '0.84rem', color: '#CBD5E1' }}>
                      Both parties confirmed upon physical meetup that this item did not belong to the claimant.
                    </p>
                    {c.handover_failure_notes && (
                      <div style={{ fontSize: '0.82rem', color: '#FCA5A5', background: 'rgba(0, 0, 0, 0.3)', padding: '6px 10px', borderRadius: '4px' }}>
                        <strong>Mismatch Notes:</strong> {c.handover_failure_notes}
                      </div>
                    )}
                    {(isAdmin || isReporter) && (
                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          className="btn btn-warning btn-sm"
                          onClick={() => handleRepostAfterFailure(c.report_id)}
                          disabled={actionLoading}
                        >
                          Reactivate Report & Evaluate Next Claimant in Queue
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
