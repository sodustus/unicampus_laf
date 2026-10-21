import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchReportDetail } from '../api/client';

export default function ReportDetailModal({ reportId, onClose, onRecover, onDelete, onClaim }) {
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
                <span className="detail-meta-label">Location</span>
                <span className="detail-meta-value">📍 {report.location}</span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">{report.type === 'lost' ? 'Date Lost' : 'Date Found'}</span>
                <span className="detail-meta-value">📅 {formattedDate}</span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Report ID</span>
                <span className="detail-meta-value">#{report.id}</span>
              </div>
            </div>

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
                    onClick={() => {
                      onRecover(report.id);
                      onClose();
                    }}
                  >
                    Mark as Recovered
                  </button>
                )}

                {/* Found Item Claim Action (Step 5 Preparation) */}
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
