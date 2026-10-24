import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminDashboard,
  fetchAdminUsers,
  toggleUserActive,
  moderateReport,
  fetchAuditLogs,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { IconShield, IconAnalytics, IconUsers, IconAudit, IconAlert, IconCheck } from '../components/Icons';

export default function AdminHubPage({
  activeSubTab = 'analytics',
  onNavigateSubTab,
  onOpenReport,
  _onRestoreReport,
  onOpenClaimsDesk,
}) {
  const { token } = useAuth();

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
    setError('');
    setModSuccess('');
    if (activeSubTab === 'analytics') loadDashboard();
    if (activeSubTab === 'users') loadUsers();
    if (activeSubTab === 'audit') loadAudit();
  }, [activeSubTab, loadDashboard, loadUsers, loadAudit]);

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

  const stats = dashboardData?.stats || {
    total_reports: 0,
    lost_reports: 0,
    found_reports: 0,
    active_reports: 0,
    recovered_reports: 0,
    recovery_rate_percent: 0,
    total_claims: 0,
    pending_claims: 0,
    total_users: 0,
  };

  return (
    <div className="admin-hub-page">
      {/* Header Card */}
      <div className="glass-panel admin-header-card">
        <div>
          <h2 className="admin-main-title">Campus Administration Console</h2>
          <p className="admin-main-subtitle">
            Enterprise management hub for campus reports, compliance auditing, user roles, and system oversight.
          </p>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="admin-tab-bar glass-panel" style={{ marginTop: '16px' }}>
        <button
          className={`admin-tab-btn ${activeSubTab === 'analytics' ? 'active' : ''}`}
          onClick={() => onNavigateSubTab('analytics')}
        >
          <IconAnalytics size={16} />
          <span>System Analytics</span>
        </button>
        <button
          className={`admin-tab-btn ${activeSubTab === 'users' ? 'active' : ''}`}
          onClick={() => onNavigateSubTab('users')}
        >
          <IconUsers size={16} />
          <span>User Directory</span>
        </button>
        <button
          className="admin-tab-btn"
          onClick={onOpenClaimsDesk}
        >
          <IconShield size={16} />
          <span>Claims Verification Desk</span>
        </button>
        <button
          className={`admin-tab-btn ${activeSubTab === 'audit' ? 'active' : ''}`}
          onClick={() => onNavigateSubTab('audit')}
        >
          <IconAudit size={16} />
          <span>Compliance Audit</span>
        </button>
      </div>

      {error && (
        <div className="alert-error" style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Subtab View 1: Analytics */}
      {activeSubTab === 'analytics' && (
        <div style={{ marginTop: '20px' }}>
          {loadingDashboard ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading analytics and overview...
            </div>
          ) : (
            <>
              {/* Metrics Grid */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-info">
                    <span className="kpi-label">Total Listings</span>
                    <span className="kpi-val">{stats.total_reports}</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-info">
                    <span className="kpi-label">Recovery Rate</span>
                    <span className="kpi-val" style={{ color: '#34d399' }}>{stats.recovery_rate_percent}%</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-info">
                    <span className="kpi-label">Pending Claim Reviews</span>
                    <span className="kpi-val" style={{ color: '#F59E0B' }}>{stats.pending_claims}</span>
                  </div>
                </div>

                <div className="kpi-card">
                  <div className="kpi-info">
                    <span className="kpi-label">Registered Accounts</span>
                    <span className="kpi-val">{stats.total_users}</span>
                  </div>
                </div>
              </div>

              {/* Moderation Box */}
              <div className="glass-panel" style={{ padding: '24px', marginTop: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px' }}>
                  Quick Report Moderation
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Close, flag, or resolve inappropriate or duplicate campus listings with an immutable audit entry.
                </p>

                {modSuccess && (
                  <div className="alert-success" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IconCheck size={16} />
                    <span>{modSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleModerate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '12px', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Report ID</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 280"
                      value={moderateReportId}
                      onChange={(e) => setModerateReportId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Target Status</label>
                    <select
                      className="form-input"
                      value={moderateStatus}
                      onChange={(e) => setModerateStatus(e.target.value)}
                    >
                      <option value="closed">Closed</option>
                      <option value="active">Active (Restore)</option>
                      <option value="recovered">Recovered</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Mandatory Audit Reason</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Duplicate listing of #14 / Policy violation"
                      value={moderationReason}
                      onChange={(e) => setModerationReason(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={moderating}>
                    {moderating ? 'Applying...' : 'Apply Action'}
                  </button>
                </form>
              </div>

              {/* Recent Reports Table */}
              <div className="glass-panel" style={{ padding: '24px', marginTop: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '12px' }}>
                  Recent Campus Listings
                </h3>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Title</th>
                        <th>Owner</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dashboardData?.recent_reports || []).map((rep) => (
                        <tr key={rep.id}>
                          <td>#{rep.id}</td>
                          <td>
                            <span className={`badge ${rep.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>
                              {rep.type.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{rep.title}</td>
                          <td>User #{rep.owner_id}</td>
                          <td>
                            <span className={`badge ${rep.status === 'active' ? 'badge-info' : 'badge-success'}`}>
                              {rep.status.toUpperCase()}
                            </span>
                          </td>
                          <td>{new Date(rep.item_date).toLocaleDateString()}</td>
                          <td>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => onOpenReport(rep.id)}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Subtab View 2: User Directory */}
      {activeSubTab === 'users' && (
        <div className="glass-panel" style={{ padding: '24px', marginTop: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px' }}>
            Campus User Directory
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Authorized students, staff, and system administrators registered across campus.
          </p>

          {loadingUsers ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading user accounts...
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Campus Email</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th>Reports</th>
                    <th>Claims</th>
                    <th>Status</th>
                    <th>Account Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td style={{ fontWeight: 700 }}>{u.full_name || 'Anonymous Student'}</td>
                      <td>{u.email}</td>
                      <td>{u.department || 'General'}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-role-admin' : 'badge-role-user'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td>{u.reports_count ?? 0}</td>
                      <td>{u.claims_count ?? 0}</td>
                      <td>
                        <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        {u.role !== 'admin' && (
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
          )}
        </div>
      )}

      {/* Subtab View 3: Audit Trail */}
      {activeSubTab === 'audit' && (
        <div className="glass-panel" style={{ padding: '24px', marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Immutable Compliance Audit Trail</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                System-wide audit records capturing all status transitions, claim verifications, and recoveries.
              </p>
            </div>
            <select
              className="form-input"
              style={{ width: 'auto' }}
              value={auditActionFilter}
              onChange={(e) => setAuditActionFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="REPORT_CREATED">Report Created</option>
              <option value="CLAIM_CREATED">Claim Created</option>
              <option value="CLAIM_APPROVED">Claim Approved</option>
              <option value="CLAIM_REJECTED">Claim Rejected</option>
              <option value="ITEM_RECOVERED">Item Recovered</option>
              <option value="REPORT_DELETED">Report Deleted</option>
              <option value="REPORT_RESTORED">Report Restored</option>
            </select>
          </div>

          {loadingAudit ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading audit records...
            </div>
          ) : auditLogs.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No audit logs match filter.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Target Entity</th>
                    <th>Timestamp</th>
                    <th>Audit Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td>#{log.id}</td>
                      <td>
                        <span className="badge badge-info">{log.action}</span>
                      </td>
                      <td>
                        {log.actor ? `${log.actor.full_name || log.actor.email} (#${log.actor_id})` : `System (#${log.actor_id || '0'})`}
                      </td>
                      <td>{log.target_type} #{log.target_id}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{log.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
