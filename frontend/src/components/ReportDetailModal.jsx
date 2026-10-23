import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchReportDetail } from '../api/client';

export default function ReportDetailModal({ reportId, onClose, onRecover, onDelete, onClaim, onViewProfile, onFoundNotice }) {
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
        return '🏛️ Deposited with Campus Authority';
      case 'with_finder':
        return '🤝 In Possession of Finder';
      case 'returned':
        return '🎉 Handed Over & Returned';
      default:
        return '❓ Unlocated';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog glass-panel" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading item details...
          </div>
        ) : error ? (
          <div className="alert-error">{error}</div>
        ) : report ? (
          <>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <span className="modal-icon">{report.type === 'lost' ? '🔍' : '📦'}</span>
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
              <button className="btn-close" onClick={onClose}>✕</button>
            </div>

            <div className="detail-meta-grid">
              <div className="detail-meta-item">
                <span className="detail-meta-label">Category</span>
                <span className="detail-meta-value">🏷️ {report.category?.name || 'Item'}</span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Location Found / Lost</span>
                <span className="detail-meta-value">📍 {report.location}</span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">{report.type === 'lost' ? 'Date Lost' : 'Date Found'}</span>
                <span className="detail-meta-value">📅 {formattedDate}</span>
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
                      {report.type === 'found' ? `📦 Finder (ID #${report.owner_id})` : `🔍 Owner (ID #${report.owner_id})`} &rarr;
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
                    📍 PHYSICAL POSSESSION / CUSTODY
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
                    🏛️ <strong>Office Custody Location:</strong> {report.custody_location}
                  </p>
                )}
                {report.possession_status === 'with_finder' && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    🤝 This item is currently held by the student finder. Contact information will be revealed once an admin approves your claim to coordinate physical pickup.
                  </p>
                )}
              </div>
            )}

            {/* Issue #7: Lost Report Handover Coordination Slip when Finder is linked */}
            {report.type === 'lost' && report.founder_id && (
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
                    📦 FINDER NOTIFICATION & HANDOVER
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
                      🤝 <strong>Found By:</strong>{' '}
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
                    <p style={{ margin: '8px 0 0 0', color: '#E2E8F0' }}>
                      🏛️ <strong>Office Custody Location:</strong> {report.custody_location}
                    </p>
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
                      💬 <strong>Finder Note:</strong> "{report.found_notes}"
                    </div>
                  )}

                  <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ℹ️ Contact information is disclosed between owner and finder to coordinate handover. The owner directly confirms receipt to finalize recovery.
                  </p>
                </div>
              </div>
            )}

            <div className="detail-section">
              <h4>Public Description</h4>
              <p className="detail-description">{report.description}</p>
            </div>

            {/* FR-SEARCH-06: Privacy Boundary Inspection */}
            <div className="detail-proof-box">
              <div className="proof-header">
                <h4>🔒 Ownership Verification Proof (FR-SEARCH-06)</h4>
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
                {canManage && (
                  <button
                    className="btn btn-delete btn-sm"
                    onClick={() => {
                      onDelete(report.id);
                      onClose();
                    }}
                  >
                    Delete Report
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Close
                </button>

                {isOwner && report.type === 'lost' && report.status === 'active' && (
                  <button
                    className="btn btn-primary"
                    style={
                      report.founder_id
                        ? { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#059669' }
                        : {}
                    }
                    onClick={() => {
                      onRecover(report);
                      onClose();
                    }}
                  >
                    {report.founder_id ? '🎉 Confirm Receipt & Mark Recovered' : '✓ Mark as Recovered'}
                  </button>
                )}

                {/* Issue #7: Lost Item Found Notice Action for non-owners */}
                {report.type === 'lost' && report.status === 'active' && !isOwner && !report.founder_id && (
                  <button
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#059669' }}
                    onClick={() => {
                      if (onFoundNotice) onFoundNotice(report);
                      onClose();
                    }}
                  >
                    📦 I Found This Item!
                  </button>
                )}

                {report.type === 'lost' && report.status === 'active' && !isOwner && report.founder_id && (
                  <span
                    className="badge"
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#6EE7B7',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    ✓ Finder Linked (#{report.founder_id})
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
                    📜 Recovery Audit Record
                  </button>
                )}

                {/* Found Item Claim Action */}
                {report.type === 'found' && report.status === 'active' && !isOwner && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      onClaim(report);
                      onClose();
                    }}
                  >
                    🤝 Claim This Item
                  </button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
