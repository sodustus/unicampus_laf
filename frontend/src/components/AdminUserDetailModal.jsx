import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAdminUserActivity } from '../api/client';
import {
  IconClose,
  IconUser,
  IconReports,
  IconClaims,
  IconMapPin,
  IconClock,
  IconPhone,
  IconAlert,
} from './Icons';

export default function AdminUserDetailModal({
  userId,
  onClose,
  onOpenReport,
}) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'claims'
  const [reportFilter, setReportFilter] = useState('all'); // 'all' | 'lost' | 'found'
  const [claimTypeFilter, setClaimTypeFilter] = useState('all'); // 'all' | 'claimant' | 'listing'

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError('');
    fetchAdminUserActivity(userId, token)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load user activity records');
        setLoading(false);
      });
  }, [userId, token]);

  if (!userId) return null;

  const user = data?.user;
  const reports = data?.reports || [];
  const claims = data?.claims || [];

  const filteredReports = reports.filter((r) => {
    if (reportFilter === 'all') return true;
    return r.type === reportFilter;
  });

  const userClaimsCount = claims.filter((c) => c.is_claimant).length;
  const listingClaimsCount = claims.filter((c) => !c.is_claimant).length;

  const filteredClaims = claims.filter((c) => {
    if (claimTypeFilter === 'claimant' && !c.is_claimant) return false;
    if (claimTypeFilter === 'listing' && c.is_claimant) return false;
    return true;
  });

  const lostCount = reports.filter((r) => r.type === 'lost').length;
  const foundCount = reports.filter((r) => r.type === 'found').length;

  const getClaimStatusBadge = (status) => {
    switch (status) {
      case 'submitted':
        return <span className="badge badge-info">Submitted</span>;
      case 'under_review':
        return <span className="badge badge-warning">Under Review</span>;
      case 'awaiting_info':
        return <span className="badge badge-danger">Awaiting Info</span>;
      case 'approved':
        return <span className="badge badge-success">Approved</span>;
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'rejected':
      case 'handover_failed':
        return <span className="badge badge-danger">Rejected</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog glass-panel"
        style={{ maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="modal-title-wrap">
            <div className="modal-icon-badge" style={{ background: 'var(--text-main)', color: 'var(--bg-dark)' }}>
              <IconUser size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                {user ? user.full_name || user.email : 'User Profile & Activity'}
              </h3>
              <p className="modal-subtitle" style={{ margin: '2px 0 0 0', fontSize: '0.82rem' }}>
                Administrative history inspection of campus member listings, claims, and verified contact.
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        {error && (
          <div className="alert-error" style={{ margin: '14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading user profile and campus activity records...
          </div>
        ) : user ? (
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginTop: '14px' }}>
            {/* User Profile Card */}
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius)',
                padding: '16px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius)',
                    background: 'var(--text-main)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: 'var(--bg-dark)',
                    flexShrink: 0,
                  }}
                >
                  {(user.full_name || user.email)[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                      {user.full_name || 'Campus Member'}
                    </strong>
                    <span className={`badge ${user.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                      {user.role.toUpperCase()}
                    </span>
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {user.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {user.email} &bull; {user.department || 'Department Undeclared'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Member #{user.id} &bull; Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Verified Phone Contact Card */}
              <div
                style={{
                  background: 'var(--bg-elevated)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <IconPhone size={15} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Registered Phone
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: user.phone_number ? 'var(--accent-found)' : 'var(--text-muted)' }}>
                    {user.phone_number || 'No phone registered'}
                  </div>
                </div>
                {user.phone_number && (
                  <a
                    href={`tel:${user.phone_number}`}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                  >
                    Call
                  </a>
                )}
              </div>
            </div>

            {/* Segmented Top Tabs */}
            <div className="claims-filter-tabs glass-panel" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className={`claims-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => setActiveTab('reports')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconReports size={14} />
                <span>Reports & Listings ({reports.length})</span>
              </button>
              <button
                type="button"
                className={`claims-tab-btn ${activeTab === 'claims' ? 'active' : ''}`}
                onClick={() => setActiveTab('claims')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconClaims size={14} />
                <span>Claims & Involvements ({claims.length})</span>
              </button>
            </div>

            {/* TAB 1: USER'S REPORTS */}
            {activeTab === 'reports' && (
              <div style={{ marginTop: '14px' }}>
                {/* Sub-filters */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { id: 'all', label: `All (${reports.length})` },
                      { id: 'lost', label: `Lost (${lostCount})` },
                      { id: 'found', label: `Found (${foundCount})` },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`dashboard-tab ${reportFilter === f.id ? 'active' : ''}`}
                        onClick={() => setReportFilter(f.id)}
                        style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Showing {filteredReports.length} of {reports.length} reports
                  </span>
                </div>

                {filteredReports.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px' }}>
                    No reports match the selected filter.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredReports.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.55)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span className={`badge ${r.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>
                              {r.type.toUpperCase()}
                            </span>
                            <span className={`badge ${r.status === 'active' ? 'badge-info' : 'badge-success'}`}>
                              {r.status.toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              #{r.id}
                            </span>
                          </div>

                          <h5
                            style={{
                              margin: '6px 0 2px 0',
                              fontSize: '0.98rem',
                              color: 'var(--text-main)',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                            onClick={() => onOpenReport(r.id)}
                            title="Inspect full report"
                          >
                            {r.title}
                          </h5>

                          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <IconMapPin size={12} />
                              <span>{r.location}</span>
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <IconClock size={12} />
                              <span>{r.item_date ? new Date(r.item_date).toLocaleDateString() : 'Date N/A'}</span>
                            </span>
                            {r.possession_status && r.possession_status !== 'lost_unknown' && (
                              <span style={{ color: 'var(--accent-found)' }}>
                                Custody: {r.possession_status === 'with_finder' ? 'In Possession of Finder' : 'Deposited at Office'}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenReport(r.id)}
                          style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                        >
                          Inspect Report
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: USER'S CLAIMS */}
            {activeTab === 'claims' && (
              <div style={{ marginTop: '14px' }}>
                {/* Sub-filters */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: `All Involvements (${claims.length})` },
                      { id: 'claimant', label: `Claims Filed (${userClaimsCount})` },
                      { id: 'listing', label: `Claims on Listings (${listingClaimsCount})` },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`dashboard-tab ${claimTypeFilter === f.id ? 'active' : ''}`}
                        onClick={() => setClaimTypeFilter(f.id)}
                        style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Showing {filteredClaims.length} of {claims.length} claims
                  </span>
                </div>

                {filteredClaims.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px' }}>
                    No claims or involvement records match the selected filter.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredClaims.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          background: 'rgba(15, 23, 42, 0.55)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span className="badge badge-info" style={{ fontWeight: 700 }}>
                              Claim #{c.id}
                            </span>
                            <span
                              className="badge"
                              style={{
                                background: c.is_claimant ? 'var(--accent-found-bg)' : 'var(--bg-elevated)',
                                color: c.is_claimant ? 'var(--accent-found)' : 'var(--text-main)',
                                border: c.is_claimant ? '1px solid var(--accent-found)' : '1px solid var(--border-subtle)',
                                fontSize: '0.72rem',
                                borderRadius: 'var(--radius)',
                              }}
                            >
                              {c.is_claimant ? 'User is Claimant / Finder' : 'Claim on User\'s Listing'}
                            </span>
                            {getClaimStatusBadge(c.status)}
                          </div>

                          <h5
                            style={{
                              margin: '6px 0 2px 0',
                              fontSize: '0.98rem',
                              color: 'var(--text-main)',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                            onClick={() => onOpenReport(c.report_id)}
                            title="Inspect related report"
                          >
                            Related Item: {c.report_title} (#{c.report_id})
                          </h5>

                          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <IconClock size={12} />
                              <span>Filed {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</span>
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <IconMapPin size={12} />
                              <span>{c.report_location}</span>
                            </span>
                            {c.proof_details && (
                              <span style={{ color: 'var(--text-muted)' }}>
                                Proof preview: "{c.proof_details.slice(0, 45)}{c.proof_details.length > 45 ? '...' : ''}"
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenReport(c.report_id)}
                          style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                        >
                          Inspect Report #{c.report_id}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Modal Footer */}
        <div className="modal-actions" style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
