import React, { useState, useEffect, useCallback } from 'react';
import { fetchUserDashboard } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  IconReports,
  IconAlert,
  IconLock,
  IconMapPin,
  IconClock,
  IconCheck,
  IconRefresh,
} from '../components/Icons';

export default function MyReportsPage({
  onOpenReport,
  onRecoverReport,
  onDeleteReport,
}) {
  const { token, user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'recovered'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'lost' | 'found'

  const loadReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchUserDashboard(token);
      const combined = [
        ...(data.active_reports || []),
        ...(data.recovered_reports || []),
      ];
      setReports(combined);
    } catch (err) {
      setError(err.message || 'Failed to load your reports');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = reports.filter((rep) => {
    if (statusFilter === 'active' && rep.status !== 'active') return false;
    if (statusFilter === 'recovered' && rep.status !== 'recovered' && rep.status !== 'closed') return false;
    if (typeFilter !== 'all' && rep.type !== typeFilter) return false;
    return true;
  });

  const activeCount = reports.filter((r) => r.status === 'active').length;
  const recoveredCount = reports.filter((r) => r.status === 'recovered' || r.status === 'closed').length;

  return (
    <div className="my-reports-page">
      {/* Page Header */}
      <div className="glass-panel dashboard-header-card">
        <div className="dashboard-header-meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-brand-crest" style={{ width: '38px', height: '38px' }}>
              <IconReports size={20} />
            </div>
            <div>
              <h2 className="dashboard-main-title">My Campus Listings</h2>
              <p className="dashboard-main-subtitle">
                Personal lost reports and found items registered by <strong>{user?.full_name || user?.email}</strong>.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={loadReports}
          disabled={loading}
          title="Refresh your listings"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <IconRefresh size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Tab Pills */}
      <div className="dashboard-tab-bar" style={{ marginTop: '16px' }}>
        <button
          type="button"
          className={`dashboard-tab ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <span>All Listings ({reports.length})</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab ${statusFilter === 'active' ? 'active' : ''}`}
          onClick={() => setStatusFilter('active')}
        >
          <span>Active Listings ({activeCount})</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab ${statusFilter === 'recovered' ? 'active' : ''}`}
          onClick={() => setStatusFilter('recovered')}
        >
          <span>Recovered / Archived ({recoveredCount})</span>
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          {['all', 'lost', 'found'].map((t) => (
            <button
              key={t}
              type="button"
              className={`dashboard-tab ${typeFilter === t ? 'active' : ''}`}
              onClick={() => setTypeFilter(t)}
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            >
              <span>{t.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert-error" style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Listings Table View */}
      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>
          Loading your listings...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="glass-panel claims-empty-box" style={{ marginTop: '20px', textAlign: 'center', padding: '48px 24px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>No Listings Found</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>
            {statusFilter === 'all'
              ? 'You have not registered any lost or found items yet.'
              : `No reports match the selected status filter (${statusFilter}).`}
          </p>
          <button type="button" className="btn btn-primary btn-sm" onClick={onOpenReportModal}>
            <IconPlus size={16} />
            <span>Create Your First Report</span>
          </button>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '20px', marginTop: '20px' }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Item Title</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Possession</th>
                  <th>Secret Proof</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((rep) => {
                  const isRecovered = rep.status === 'recovered' || rep.status === 'closed';
                  return (
                    <tr key={rep.id}>
                      <td>#{rep.id}</td>
                      <td>
                        <span className={`badge ${rep.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>
                          {rep.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{rep.title}</span>
                          {rep.category && (
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {rep.category.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <IconMapPin size={13} />
                          <span>{rep.location}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <IconClock size={13} />
                          <span>{new Date(rep.item_date).toLocaleDateString()}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {rep.possession_status === 'submitted_to_authority'
                            ? 'Deposited with Authority'
                            : rep.possession_status === 'with_finder'
                            ? 'With Finder'
                            : rep.possession_status === 'returned'
                            ? 'Returned to Owner'
                            : 'Unknown'}
                        </span>
                      </td>
                      <td>
                        {rep.identifying_details ? (
                          <span
                            className="badge badge-warning"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}
                            title="Private secret proof attached to this report"
                          >
                            <IconLock size={12} />
                            <span>Attached</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>None</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${isRecovered ? 'badge-success' : 'badge-info'}`}>
                          {rep.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => onOpenReport(rep.id)}
                            title="View complete details"
                          >
                            Inspect
                          </button>

                          {!isRecovered && onRecoverReport && (
                            <button
                              type="button"
                              className="btn btn-recover btn-sm"
                              onClick={() => onRecoverReport(rep)}
                              title="Mark item recovered"
                            >
                              <IconCheck size={14} />
                              <span>Recover</span>
                            </button>
                          )}

                          {onDeleteReport && (
                            <button
                              type="button"
                              className="btn btn-delete btn-sm"
                              onClick={() => onDeleteReport(rep.id)}
                              title="Delete this listing"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
