import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchReportDetail } from '../api/client';
import { IconClose, IconSearch, IconTag, IconMapPin, IconClock, IconShield } from './Icons';

export default function ReportDetailModal({ reportId, onClose, onRecover, onDelete, onRestore, onClaim, onViewProfile, onFoundNotice }) {
  const { user, token, isAdmin } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    fetchReportDetail(reportId, token)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load report details');
        setLoading(false);
      });
  }, [reportId, token]);

  if (!reportId) return null;

  const isOwner = user && report && user.id === report.owner_id;
  const canManage = isOwner || isAdmin;

  const formattedDate = report
    ? new Date(report.item_date).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const getPossessionLabel = (st) => {
    switch (st) {
      case 'submitted_to_authority':
        return 'Deposited with Campus Authority';
      case 'with_finder':
        return 'In Possession of Finder';
      case 'returned':
        return 'Handed Over & Returned';
      default:
        return 'Unlocated';
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog glass-panel" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading item details...
          </div>
        ) : error ? (
          <div className="alert-error">{error}</div>
        ) : report ? (
          <>
            {report.deleted_at && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#FCA5A5',
                  fontSize: '0.9rem',
                }}
              >
                <strong>Soft-Deleted Report</strong> &bull; Reason: {report.deletion_reason || 'No deletion reason specified'}
              </div>
            )}
            <div className="modal-header">
              <div className="modal-title-wrap">
                <div className="modal-icon-badge">
                  {report.type === 'lost' ? <IconSearch size={18} /> : <IconTag size={18} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge ${report.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>
                      {report.type === 'lost' ? 'LOST ITEM' : 'FOUND ITEM'}
                    </span>
                    <span
                      className={`badge ${
                        report.status === 'active'
                          ? 'badge-info'
                          : report.status === 'recovered'
                          ? 'badge-success'
                          : 'badge-warning'
                      }`}
                    >
                      {report.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 style={{ marginTop: '6px' }}>{report.title}</h3>
                </div>
              </div>
              <button className="btn-close" onClick={onClose} aria-label="Close">
                <IconClose size={18} />
              </button>
            </div>

            <div className="detail-meta-grid">
              <div className="detail-meta-item">
                <span className="detail-meta-label">Category</span>
                <span className="detail-meta-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconTag size={14} /> {report.category?.name || 'Item'}
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Location Found / Lost</span>
                <span className="detail-meta-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconMapPin size={14} /> {report.location}
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">{report.type === 'lost' ? 'Date Lost' : 'Date Found'}</span>
                <span className="detail-meta-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconClock size={14} /> {formattedDate}
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">
                  {report.type === 'found' ? 'Found By (Finder)' : 'Reported By (Loser/Owner)'}
                </span>
                <span className="detail-meta-value">
                  {onViewProfile ? (
                    <button
                      type="button"
                      className="btn-link"
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.8rem',
                        color: '#93C5FD',
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      onClick={() => onViewProfile(report.owner_id)}
                    >
                      {report.type === 'found' ? `Finder (ID #${report.owner_id})` : `Owner (ID #${report.owner_id})`} &rarr;
                    </button>
                  ) : (
                    report.type === 'found' ? `Finder #${report.owner_id}` : `Owner #${report.owner_id}`
                  )}
                </span>
              </div>
            </div>

            {/* Issue #2: Physical Custody / Handover System Box for Found Reports */}
            {report.type === 'found' && (
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  margin: '14px 0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#93C5FD' }}>
                    PHYSICAL POSSESSION / CUSTODY
                  </span>
                  <span
                    className="badge"
                    style={{
                      background:
                        report.possession_status === 'submitted_to_authority'
                          ? 'rgba(168, 85, 247, 0.25)'
                          : 'rgba(59, 130, 246, 0.25)',
                      color:
                        report.possession_status === 'submitted_to_authority'
                          ? '#C084FC'
                          : '#93C5FD',
                    }}
                  >
                    {getPossessionLabel(report.possession_status)}
                  </span>
                </div>
                {report.possession_status === 'submitted_to_authority' && report.custody_location && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem', color: '#E2E8F0' }}>
                    <strong>Office Custody Location:</strong> {report.custody_location}
                  </p>
                )}
                {report.possession_status === 'with_finder' && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    This item is currently held by the student finder. Contact information will be revealed once an admin approves your claim to coordinate physical pickup.
                  </p>
                )}
              </div>
            )}

            {/* Issue #7: Lost Report Verification / Handover State */}
            {report.type === 'lost' && report.founder_id && (
              report.claim_status === 'approved' || report.claim_status === 'completed' ? (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    margin: '14px 0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34D399' }}>
                      OFFICIAL HANDOVER COORDINATION SLIP (ADMIN APPROVED)
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: 'rgba(16, 185, 129, 0.25)',
                        color: '#6EE7B7',
                      }}
                    >
                      {getPossessionLabel(report.possession_status)}
                    </span>
                  </div>

                  <div style={{ marginTop: '8px', fontSize: '0.88rem', color: '#E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>
                        <strong>Verified Finder:</strong>{' '}
                        {report.founder ? (report.founder.full_name || report.founder.email) : `Student #${report.founder_id}`}
                      </span>
                      {onViewProfile && (
                        <button
                          type="button"
                          className="btn-link"
                          style={{
                            padding: '2px 8px',
                            fontSize: '0.78rem',
                            color: '#34D399',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                          onClick={() => onViewProfile(report.founder_id)}
                        >
                          View Finder Profile & Phone &rarr;
                        </button>
                      )}
                    </div>

                    {report.possession_status === 'submitted_to_authority' && report.custody_location && (
                      <div style={{ margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, color: '#E2E8F0' }}>
                          <strong>Office Custody Location:</strong> {report.custody_location}
                        </p>
                        {report.custody_location.match(/(\+?[0-9]{7,15})/) && (
                          <a
                            href={`tel:${report.custody_location.match(/(\+?[0-9]{7,15})/)[0]}`}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                            title="Call custodian office directly"
                          >
                            Call Office
                          </a>
                        )}
                      </div>
                    )}

                    {report.found_notes && (
                      <div
                        style={{
                          marginTop: '8px',
                          background: 'rgba(0, 0, 0, 0.2)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontStyle: 'italic',
                          color: '#CBD5E1',
                        }}
                      >
                        <strong>Finder Note:</strong> "{report.found_notes}"
                      </div>
                    )}

                    <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: '#6EE7B7' }}>
                      Double-blind verification approved by campus administration. Contact details are unlocked to coordinate physical handover. The owner confirms receipt below to finalize recovery.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(234, 179, 8, 0.08)',
                    border: '1px solid rgba(234, 179, 8, 0.35)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    margin: '14px 0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FBBF24' }}>
                      DOUBLE-BLIND VERIFICATION IN PROGRESS (ADMIN REVIEW)
                    </span>
                    <span className="badge badge-warning">
                      Pending Admin Review
                    </span>
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#E2E8F0' }}>
                    A student reported finding this item and submitted distinguishing physical proof. To protect against theft, campus administrators are currently comparing both explanations. Handover contact details will unlock once an administrator approves the match.
                  </p>
                </div>
              )
            )}

            <div className="detail-section">
              <h4>Public Description</h4>
              <p className="detail-description">{report.description}</p>
            </div>

            {/* FR-SEARCH-06: Privacy Boundary Inspection */}
            <div className="detail-proof-box">
              <div className="proof-header">
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconShield size={15} /> Ownership Verification Proof (FR-SEARCH-06)
                </h4>
                {report.identifying_details ? (
                  <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                    AUTHENTICATED ({isOwner ? 'Owner' : 'Administrator'})
                  </span>
                ) : (
                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                    CONFIDENTIAL (Public View)
                  </span>
                )}
              </div>
              {report.identifying_details ? (
                <p className="proof-content">{report.identifying_details}</p>
              ) : (
                <p className="proof-content confidential">
                  Identifying details are kept strictly hidden from the public to prevent fraudulent claims. 
                  Only the report creator and reviewing administrators have permission to inspect this field.
                </p>
              )}
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {report.deleted_at ? (
                  isAdmin && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#059669' }}
                      onClick={() => {
                        if (onRestore) onRestore(report.id);
                        onClose();
                      }}
                    >
                      Restore / Rollback Report
                    </button>
                  )
                ) : (
                  canManage && (
                    <button
                      type="button"
                      className="btn btn-delete btn-sm"
                      onClick={() => {
                        onDelete(report.id);
                        onClose();
                      }}
                    >
                      {isAdmin ? 'Delete as Duplicate' : 'Delete Report'}
                    </button>
                  )
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Close
                </button>

                {isOwner && report.type === 'lost' && report.status === 'active' && (
                  report.founder_id ? (
                    report.claim_status === 'approved' ? (
                      <button
                        className="btn btn-primary"
                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#059669' }}
                        onClick={() => {
                          onRecover(report);
                          onClose();
                        }}
                      >
                        Confirm Receipt & Mark Recovered
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ opacity: 0.7, cursor: 'not-allowed' }}
                        disabled
                        title="Administrators are comparing both double-blind proofs to prevent theft. You can confirm receipt once approved."
                      >
                        Awaiting Admin Verification
                      </button>
                    )
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        onRecover(report);
                        onClose();
                      }}
                    >
                      Mark as Recovered
                    </button>
                  )
                )}

                {/* Issue #7: Lost Item Found Notice Action for non-owners */}
                {report.type === 'lost' && report.status === 'active' && !isOwner && !report.founder_id && !report.user_has_claimed && (
                  <button
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#059669' }}
                    onClick={() => {
                      if (onFoundNotice) onFoundNotice(report);
                      onClose();
                    }}
                  >
                    I Found This Item
                  </button>
                )}

                {report.type === 'lost' && report.status === 'active' && !isOwner && report.user_has_claimed && (
                  <span
                    className="badge badge-info"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Your found notice is currently being processed by campus administration."
                  >
                    Found notice currently under review
                  </span>
                )}

                {report.type === 'lost' && report.status === 'active' && !isOwner && !report.user_has_claimed && report.founder_id && (
                  <span
                    className={`badge ${report.claim_status === 'approved' ? 'badge-success' : 'badge-warning'}`}
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    {report.claim_status === 'approved' ? 'Handover Approved' : 'Verification Under Review'}
                  </span>
                )}

                {report.status === 'recovered' && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      onRecover(report);
                      onClose();
                    }}
                  >
                    Recovery Audit Record
                  </button>
                )}

                {/* Found Item Claim Action */}
                {report.type === 'found' && report.status === 'active' && !isOwner && !report.user_has_claimed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {report.user_claim_status === 'rejected' && (
                      <span style={{ fontSize: '0.8rem', color: '#93C5FD' }}>
                        Previous claim rejected. You can try claiming again if you think this is a mistake.
                      </span>
                    )}
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        onClaim(report);
                        onClose();
                      }}
                    >
                      {report.user_claim_status === 'rejected' ? 'Try Claiming Again' : 'Claim This Item'}
                    </button>
                  </div>
                )}

                {report.type === 'found' && report.status === 'active' && !isOwner && report.user_has_claimed && (
                  <span
                    className="badge badge-info"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Your ownership claim is currently being processed by campus administration."
                  >
                    Ownership claim currently under review
                  </span>
                )}

                {/* Reporter Rule Badge for Found Item */}
                {report.type === 'found' && report.status === 'active' && isOwner && (
                  <span
                    className="badge badge-info"
                    style={{
                      padding: '8px 14px',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="A user cannot be both the reporter and claimer on the same report."
                  >
                    You reported this item (Reporter) • Cannot claim own report
                  </span>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
