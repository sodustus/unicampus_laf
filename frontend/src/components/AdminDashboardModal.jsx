import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminDashboard,
  fetchAdminUsers,
  toggleUserActive,
  moderateReport,
  permanentDeleteReport,
  fetchAuditLogs,
} from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboardModal({
  isOpen,
  onClose,
  onOpenReport,
  onOpenClaimsManager,
}) {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'moderation' | 'users' | 'audit'

  // Overview data
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Users data
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Audit logs data
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('');

  // Moderation state
  const [moderateReportId, setModerateReportId] = useState('');
  const [moderateStatus, setModerateStatus] = useState('closed');
  const [moderationReason, setModerationReason] = useState('');
  const [moderating, setModerating] = useState(false);
  const [modSuccess, setModSuccess] = useState('');

  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoadingDashboard(true);
    try {
      const data = await fetchAdminDashboard(token);
      setDashboardData(data);
    } catch (err) {
      setError(err.message || 'Failed to load admin dashboard');
    } finally {
      setLoadingDashboard(false);
    }
  }, [token]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const data = await fetchAdminUsers(token);
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to load user list');
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  const loadAudit = useCallback(async () => {
    if (!token) return;
    setLoadingAudit(true);
    try {
      const data = await fetchAuditLogs({ action: auditActionFilter, limit: 50 }, token);
      setAuditLogs(data);
    } catch (err) {
      setError(err.message || 'Failed to load audit trail');
    } finally {
      setLoadingAudit(false);
    }
  }, [token, auditActionFilter]);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setModSuccess('');
      if (activeTab === 'overview') loadDashboard();
      if (activeTab === 'users') loadUsers();
      if (activeTab === 'audit') loadAudit();
    }
  }, [isOpen, activeTab, loadDashboard, loadUsers, loadAudit]);

  if (!isOpen) return null;

  const handleToggleActive = async (userId) => {
    try {
      await toggleUserActive(userId, token);
      loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to toggle account active status');
    }
  };

  const handleModerate = async (e) => {
    e.preventDefault();
    if (!moderateReportId || !moderationReason.trim()) return;
    setModerating(true);
    setModSuccess('');
    try {
      await moderateReport(parseInt(moderateReportId), moderateStatus, moderationReason.trim(), token);
      setModSuccess(`Report #${moderateReportId} successfully moderated to '${moderateStatus}'.`);
      setModerateReportId('');
      setModerationReason('');
      loadDashboard();
    } catch (err) {
      alert(err.message || 'Failed to moderate report');
    } finally {
      setModerating(false);
    }
  };

  const handlePermanentDelete = async (repId) => {
    if (!window.confirm(`CAUTION: Permanently purge Report #${repId} from the database? This cannot be undone.`)) {
      return;
    }
    try {
      await permanentDeleteReport(repId, token);
      alert(`Report #${repId} permanently purged.`);
      loadDashboard();
    } catch (err) {
      alert(err.message || 'Failed to purge report');
    }
  };

  const stats = dashboardData?.stats || {
    total_reports: 0,
    lost_reports: 0,
    found_reports: 0,
    active_reports: 0,
    recovered_reports: 0,
    recovery_rate_percent: 0,
    total_users: 0,
    pending_claims: 0,
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog glass-panel dashboard-dialog"
        style={{ maxWidth: '960px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">🛡️</span>
            <div>
              <h3>Campus Operations Console</h3>
              <p className="modal-subtitle">
                System Administration &bull; Inventory, Moderation, Accounts & Audit Log
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Tab Controls */}
        <div className="dashboard-tab-bar">
          <button
            className={`dashboard-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 System Overview
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'moderation' ? 'active' : ''}`}
            onClick={() => setActiveTab('moderation')}
          >
            ⚖️ Content Moderation
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 User Accounts
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            🔒 Audit Trail (FR-AUDIT)
          </button>
        </div>

        {error && <div className="alert-error" style={{ margin: '12px 0' }}>{error}</div>}

        <div className="dashboard-content-body">
          {/* TAB 1: SYSTEM OVERVIEW */}
          {activeTab === 'overview' && (
            loadingDashboard ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading system metrics...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* KPI Metrics Strip */}
                <div className="kpi-grid">
                  <div className="kpi-card">
                    <span className="kpi-icon">📦</span>
                    <div className="kpi-info">
                      <span className="kpi-val">{stats.total_reports}</span>
                      <span className="kpi-label">Total Listings</span>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <span className="kpi-icon">🔍</span>
                    <div className="kpi-info">
                      <span className="kpi-val">{stats.lost_reports}</span>
                      <span className="kpi-label">Lost Reports</span>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <span className="kpi-icon">🏷️</span>
                    <div className="kpi-info">
                      <span className="kpi-val">{stats.found_reports}</span>
                      <span className="kpi-label">Found Reports</span>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <span className="kpi-icon">📈</span>
                    <div className="kpi-info">
                      <span className="kpi-val" style={{ color: '#10B981' }}>{stats.recovery_rate_percent}%</span>
                      <span className="kpi-label">Recovery Rate</span>
                    </div>
                  </div>

                  <div className="kpi-card">
                    <span className="kpi-icon">👥</span>
                    <div className="kpi-info">
                      <span className="kpi-val">{stats.total_users}</span>
                      <span className="kpi-label">Campus Users</span>
                    </div>
                  </div>

                  <div className="kpi-card" onClick={onOpenClaimsManager} style={{ cursor: 'pointer' }}>
                    <span className="kpi-icon">⚠️</span>
                    <div className="kpi-info">
                      <span className="kpi-val" style={{ color: stats.pending_claims > 0 ? '#F59E0B' : '#10B981' }}>
                        {stats.pending_claims}
                      </span>
                      <span className="kpi-label">Pending Claims (Review)</span>
                    </div>
                  </div>
                </div>

                {/* Pending Claims Fast-Action Queue */}
                <div className="dash-section-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4>🚨 Priority Claims Awaiting Decision ({dashboardData.pending_claims.length})</h4>
                    <button className="btn btn-secondary btn-sm" onClick={onOpenClaimsManager}>
                      Open Claims Review Desk &rarr;
                    </button>
                  </div>
                  {dashboardData.pending_claims.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '10px' }}>
                      All ownership claims have been resolved. Good job!
                    </p>
                  ) : (
                    <div className="dashboard-list" style={{ marginTop: '10px' }}>
                      {dashboardData.pending_claims.slice(0, 5).map((cl) => (
                        <div key={cl.id} className="dash-item-card" style={{ padding: '12px' }}>
                          <div className="dash-item-header">
                            <div>
                              <strong>Claim #{cl.id}</strong> on Report #{cl.report_id}
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '10px' }}>
                                Claimant #{cl.claimant_id}
                              </span>
                            </div>
                            <span className={`badge badge-status-${cl.status}`}>
                              {cl.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: '#E2E8F0', margin: '6px 0' }}>
                            <strong>Proof:</strong> {cl.verification_record?.proof_details}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent System Activity Preview */}
                <div className="dash-section-box">
                  <h4>⚡ Recent Campus Activity (Audit Trail Preview)</h4>
                  <div className="dashboard-list" style={{ marginTop: '10px' }}>
                    {dashboardData.recent_activity.slice(0, 5).map((act) => (
                      <div key={act.id} className="audit-row-item">
                        <span className="badge badge-info">{act.action}</span>
                        <span className="audit-detail-text">{act.details || `Entity: ${act.target_type} #${act.target_id}`}</span>
                        <span className="audit-actor">{act.actor_email}</span>
                        <span className="audit-time">{new Date(act.created_at).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}

          {/* TAB 2: CONTENT MODERATION */}
          {activeTab === 'moderation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="dash-section-box">
                <h4>⚖️ Moderate Report (FR-DASH-A-03)</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '4px 0 14px 0' }}>
                  Administrators can change report statuses, soft-delete inappropriate reports, or record administrative notices.
                </p>

                {modSuccess && <div className="badge badge-success" style={{ margin: '8px 0', padding: '8px 12px' }}>{modSuccess}</div>}

                <form onSubmit={handleModerate} className="auth-form" style={{ maxWidth: '500px' }}>
                  <div className="form-group">
                    <label htmlFor="mod-rep-id">Report ID:</label>
                    <input
                      id="mod-rep-id"
                      type="number"
                      required
                      placeholder="e.g. 5"
                      className="form-input"
                      value={moderateReportId}
                      onChange={(e) => setModerateReportId(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="mod-status">New Status:</label>
                    <select
                      id="mod-status"
                      className="form-input"
                      value={moderateStatus}
                      onChange={(e) => setModerateStatus(e.target.value)}
                    >
                      <option value="closed">Closed (Soft Delete / Unlisted)</option>
                      <option value="active">Active (Restored)</option>
                      <option value="recovered">Recovered (Resolved)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="mod-reason">Moderation Reason (Required for Audit Trail):</label>
                    <textarea
                      id="mod-reason"
                      rows="3"
                      required
                      className="form-input"
                      placeholder="e.g. Duplicate report / Inappropriate content / Student requested closure"
                      value={moderationReason}
                      onChange={(e) => setModerationReason(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={moderating}>
                    {moderating ? 'Applying Moderation...' : 'Apply Moderation'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: USER ACCOUNTS MANAGEMENT */}
          {activeTab === 'users' && (
            loadingUsers ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading user accounts...
              </div>
            ) : (
              <div className="dash-section-box">
                <h4>👥 Registered Campus Accounts ({users.length})</h4>
                <div className="table-responsive" style={{ marginTop: '12px' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User & Department</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Reports</th>
                        <th>Claims</th>
                        <th>Joined</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>#{u.id}</td>
                          <td>
                            <div><strong>{u.full_name || u.email}</strong></div>
                            {u.full_name && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {u.email}
                              </div>
                            )}
                            {u.department && (
                              <div style={{ fontSize: '0.72rem', color: '#93C5FD' }}>
                                🏛️ {u.department}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${u.role === 'admin' ? 'badge-role-admin' : 'badge-role-user'}`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                              {u.is_active ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td>{u.reports_count}</td>
                          <td>{u.claims_count}</td>
                          <td>{new Date(u.created_at).toLocaleDateString()}</td>
                          <td>
                            {u.id !== user?.id && (
                              <button
                                className={`btn btn-sm ${u.is_active ? 'btn-delete' : 'btn-primary'}`}
                                onClick={() => handleToggleActive(u.id)}
                              >
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* TAB 4: IMMUTABLE AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="dash-section-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4>🔒 Immutable Audit Log (FR-AUDIT-01, FR-AUDIT-05)</h4>
                <select
                  className="filter-select"
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                >
                  <option value="">All Actions</option>
                  <option value="REPORT_CREATED">Report Created</option>
                  <option value="REPORT_DELETED">Report Soft-Deleted</option>
                  <option value="REPORT_MODERATED">Report Moderated</option>
                  <option value="ITEM_RECOVERED">Item Recovered</option>
                  <option value="CLAIM_SUBMITTED">Claim Submitted</option>
                  <option value="CLAIM_APPROVED">Claim Approved</option>
                  <option value="CLAIM_REJECTED">Claim Rejected</option>
                  <option value="CLAIM_COMPLETED">Claim Completed</option>
                  <option value="USER_DEACTIVATED">User Deactivated</option>
                </select>
              </div>

              {loadingAudit ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading immutable audit entries...
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Action</th>
                        <th>Actor</th>
                        <th>Target</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ whiteSpace: 'nowrap', fontSize: '0.78125rem', color: 'var(--text-dim)' }}>
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td>
                            <span className="badge badge-info">{log.action}</span>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{log.actor_email}</td>
                          <td style={{ fontSize: '0.85rem' }}>{log.target_type} #{log.target_id}</td>
                          <td style={{ fontSize: '0.8125rem', color: '#E2E8F0' }}>{log.details || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
