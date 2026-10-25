import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminDashboard,
  fetchAdminUsers,
  toggleUserActive,
  fetchAuditLogs,
  permanentDeleteReport,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import { IconAlert } from '../components/Icons';
import ClaimsCenterPage from './ClaimsCenterPage';
import ActionDialogModal from '../components/ActionDialogModal';

export default function AdminHubPage({
  activeSubTab = 'analytics',
  initialTab,
  onOpenReport,
  onRestoreReport,
  onViewProfile,
}) {
  const { token } = useAuth();
  const currentTab = ['analytics', 'users', 'claims', 'audit', 'deleted'].includes(activeSubTab)
    ? activeSubTab
    : (['analytics', 'users', 'claims', 'audit', 'deleted'].includes(initialTab) ? initialTab : 'analytics');

  const [dialogConfig, setDialogConfig] = useState(null);

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
    if (currentTab === 'analytics') loadDashboard();
    if (currentTab === 'users') loadUsers();
    if (currentTab === 'audit') loadAudit();
  }, [currentTab, loadDashboard, loadUsers, loadAudit]);

  const handleToggleActive = async (userId) => {
    try {
      await toggleUserActive(userId, token);
      loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to toggle account active status');
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

      {error && (
        <div className="alert-error" style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Subtab View 1: Analytics */}
      {currentTab === 'analytics' && (
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
                      {(!dashboardData?.recent_reports || dashboardData.recent_reports.length === 0) ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                            No recent campus listings found.
                          </td>
                        </tr>
                      ) : (
                        dashboardData.recent_reports.map((rep) => (
                          <tr key={rep.id}>
                            <td><strong>#{rep.id}</strong></td>
                            <td>
                              <span className={`badge ${rep.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>
                                {rep.type.toUpperCase()}
                              </span>
                            </td>
                            <td>
                              <span
                                style={{ fontWeight: 600, color: '#93C5FD', cursor: 'pointer' }}
                                onClick={() => onOpenReport(rep.id)}
                                title="Click to inspect report details"
                              >
                                {rep.title}
                              </span>
                            </td>
                            <td>{rep.owner?.full_name || rep.owner?.email || `User #${rep.owner_id}`}</td>
                            <td>
                              <span className={`badge ${rep.status === 'active' ? 'badge-info' : 'badge-success'}`}>
                                {rep.status.toUpperCase()}
                              </span>
                            </td>
                            <td>{new Date(rep.item_date).toLocaleDateString()}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => onOpenReport(rep.id)}
                                title="Inspect report details"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Subtab View 2: User Directory */}
      {currentTab === 'users' && (
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
                      <td style={{ fontWeight: 700 }}>{u.full_name || u.email?.split('@')[0] || 'Campus Member'}</td>
                      <td>{u.email}</td>
                      <td>{u.department || 'Undeclared'}</td>
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

      {/* Subtab View 3: Claims Verification Desk */}
      {currentTab === 'claims' && (
        <div style={{ marginTop: '20px' }}>
          <ClaimsCenterPage embedded={true} onOpenReport={onOpenReport} onViewProfile={onViewProfile} />
        </div>
      )}

      {/* Subtab View 4: Audit Trail */}
      {currentTab === 'audit' && (
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

      {/* Subtab View 5: Deleted & Duplicate Reports */}
      {currentTab === 'deleted' && (
        <div className="glass-panel" style={{ padding: '24px', marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Soft-Deleted & Duplicate Listings ({dashboardData?.deleted_reports?.length || 0})</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Reports removed from the public feed due to duplicate status or campus policy violations. Administrators can inspect or restore them at any time.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={loadDashboard}>
              Refresh
            </button>
          </div>

          {(!dashboardData?.deleted_reports || dashboardData.deleted_reports.length === 0) ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No deleted or duplicate reports found. All campus listings are active.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Item Title</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Deletion Reason</th>
                    <th>Deleted Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.deleted_reports.map((r) => (
                    <tr key={r.id}>
                      <td><strong>#{r.id}</strong></td>
                      <td>
                        <span
                          style={{ fontWeight: 600, cursor: 'pointer', color: '#93C5FD' }}
                          onClick={() => onOpenReport(r.id)}
                          title="Click to inspect report details"
                        >
                          {r.title}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${r.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>
                          {r.type.toUpperCase()}
                        </span>
                      </td>
                      <td>{r.location}</td>
                      <td>
                        <span style={{ color: '#FCA5A5', fontSize: '0.85rem' }}>
                          {r.deletion_reason || 'Administrative removal'}
                        </span>
                      </td>
                      <td>
                        {r.deleted_at ? new Date(r.deleted_at).toLocaleString() : 'N/A'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={async () => {
                              if (onRestoreReport) {
                                await onRestoreReport(r.id);
                                loadDashboard();
                              }
                            }}
                          >
                            Restore Report
                          </button>
                          <button
                            type="button"
                            className="btn btn-delete btn-sm"
                            onClick={() => {
                              setDialogConfig({
                                title: 'Permanently Purge Listing',
                                message: `Are you sure you want to permanently delete Report #${r.id} ("${r.title}") from the campus database? This action cannot be undone and will purge all associated records.`,
                                confirmLabel: 'Permanently Delete',
                                confirmVariant: 'danger',
                                onConfirm: async () => {
                                  setDialogConfig(null);
                                  try {
                                    await permanentDeleteReport(r.id, token);
                                    loadDashboard();
                                  } catch (err) {
                                    alert(err.message || 'Failed to permanently delete report');
                                  }
                                },
                              });
                            }}
                            title="Permanently remove report from database"
                          >
                            Permanently Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
