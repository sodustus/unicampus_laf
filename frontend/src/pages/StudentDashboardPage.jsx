import React, { useState, useEffect, useCallback } from 'react';
import { fetchUserDashboard, respondToClaimInfo, confirmClaimReceipt } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function StudentDashboardPage({
  onOpenReport,
  onRecoverReport,
  onDeleteReport,
  onOpenReportModal,
}) {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'recovered' | 'claims'

  // Inline respond state for claims awaiting info
  const [activeRespondId, setActiveRespondId] = useState(null);
  const [additionalText, setAdditionalText] = useState('');
  const [responding, setResponding] = useState(false);
  const [confirmingReceiptId, setConfirmingReceiptId] = useState(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchUserDashboard(token);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load user dashboard');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRespond = async (claimId) => {
    if (!additionalText.trim()) return;
    setResponding(true);
    try {
      await respondToClaimInfo(claimId, additionalText.trim(), token);
      setActiveRespondId(null);
      setAdditionalText('');
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to submit additional info');
    } finally {
      setResponding(false);
    }
  };

  const handleConfirmReceipt = async (claimId) => {
    if (!window.confirm("Are you sure you have physically met and received your item back in good condition?")) return;
    setConfirmingReceiptId(claimId);
    try {
      await confirmClaimReceipt(claimId, token);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to confirm item receipt');
    } finally {
      setConfirmingReceiptId(null);
    }
  };

  const stats = data?.stats || {
    active_reports_count: 0,
    recovered_reports_count: 0,
    total_claims_count: 0,
    action_required_claims_count: 0,
  };

  return (
    <div className="dashboard-page-container">
      {/* Student Banner */}
      <div className="glass-panel dashboard-header-card">
        <div className="dashboard-header-meta">
          <h2 className="dashboard-main-title">
            Personal Lost & Found Hub
          </h2>
          <p className="dashboard-main-subtitle">
            Student: <strong>{user?.full_name || user?.email}</strong>
            {user?.department && <span> &bull; {user.department}</span>}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onOpenReportModal}
        >
          <IconPlus size={16} />
          <span>Post New Report</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="kpi-grid" style={{ marginTop: '20px' }}>
        <div className={`kpi-card ${activeTab === 'active' ? 'kpi-selected' : ''}`} onClick={() => setActiveTab('active')}>
          <div className="kpi-info">
            <span className="kpi-label">Active Listings</span>
            <span className="kpi-val">{stats.active_reports_count}</span>
          </div>
        </div>

        <div className={`kpi-card ${activeTab === 'recovered' ? 'kpi-selected' : ''}`} onClick={() => setActiveTab('recovered')}>
          <div className="kpi-info">
            <span className="kpi-label">Recovered History</span>
            <span className="kpi-val" style={{ color: '#34d399' }}>{stats.recovered_reports_count}</span>
          </div>
        </div>

        <div className={`kpi-card ${activeTab === 'claims' ? 'kpi-selected' : ''}`} onClick={() => setActiveTab('claims')}>
          <div className="kpi-info">
            <span className="kpi-label">Claims Filed</span>
            <span className="kpi-val">{stats.total_claims_count}</span>
          </div>
        </div>

        <div className={`kpi-card ${activeTab === 'claims' ? 'kpi-selected' : ''}`} onClick={() => setActiveTab('claims')}>
          <div className="kpi-info">
            <span className="kpi-label">Requires Response</span>
            <span className="kpi-val" style={{ color: stats.action_required_claims_count > 0 ? '#F59E0B' : '#10B981' }}>
              {stats.action_required_claims_count}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="dashboard-tab-bar" style={{ marginTop: '24px' }}>
        <button
          className={`dashboard-tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Reports ({stats.active_reports_count})
        </button>
        <button
          className={`dashboard-tab ${activeTab === 'recovered' ? 'active' : ''}`}
          onClick={() => setActiveTab('recovered')}
        >
          Recovered History ({stats.recovered_reports_count})
        </button>
        <button
          className={`dashboard-tab ${activeTab === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveTab('claims')}
        >
          My Claims Tracker ({stats.total_claims_count})
        </button>
      </div>

      {error && (
        <div className="alert-error" style={{ margin: '14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '16px' }}>
          Loading dashboard records...
        </div>
      ) : (
        <div className="dashboard-content-body" style={{ marginTop: '16px' }}>
          {/* Active Reports Tab */}
          {activeTab === 'active' && (
            <div className="dashboard-list">
              {data.active_reports.length === 0 ? (
                <div className="glass-panel empty-reports-box">
                  <h4>No active reports found</h4>
                  <p>You currently have no open lost or found reports on campus.</p>
                </div>
              ) : (
                data.active_reports.map((rep) => (
                  <div key={rep.id} className="dash-item-card glass-panel">
                    <div className="dash-item-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${rep.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>
                          {rep.type.toUpperCase()}
                        </span>
                        <h4>{rep.title}</h4>
                      </div>
                      <span className="badge badge-info">#{rep.id}</span>
                    </div>
                    <p className="dash-item-desc">{rep.description}</p>
                    <div className="dash-item-footer">
                      <span className="dash-item-meta">
                        Location: {rep.location} &bull; Date: {new Date(rep.item_date).toLocaleDateString()}
                      </span>
                      <div className="dash-item-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => onOpenReport(rep.id)}>
                          Inspect
                        </button>
                        {rep.type === 'lost' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => onRecoverReport(rep)}
                          >
                            Mark Recovered
                          </button>
                        )}
                        <button
                          className="btn btn-delete btn-sm"
                          onClick={() => onDeleteReport(rep.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Recovered History Tab */}
          {activeTab === 'recovered' && (
            <div className="dashboard-list">
              {data.recovered_reports.length === 0 ? (
                <div className="glass-panel empty-reports-box">
                  <h4>No recovered reports yet</h4>
                  <p>Items you successfully recover or mark resolved will be archived here.</p>
                </div>
              ) : (
                data.recovered_reports.map((rep) => (
                  <div key={rep.id} className="dash-item-card glass-panel" style={{ borderLeft: '4px solid #10B981' }}>
                    <div className="dash-item-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-success">RECOVERED</span>
                        <h4>{rep.title}</h4>
                      </div>
                      <span className="badge badge-info">#{rep.id}</span>
                    </div>
                    <p className="dash-item-desc">{rep.description}</p>
                    <div className="dash-item-footer">
                      <span className="dash-item-meta">
                        Returned: {new Date(rep.updated_at || rep.item_date).toLocaleDateString()}
                      </span>
                      <button className="btn btn-secondary btn-sm" onClick={() => onOpenReport(rep.id)}>
                        View Receipt
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Claims Tab */}
          {activeTab === 'claims' && (
            <div className="dashboard-list">
              {data.filed_claims.length === 0 ? (
                <div className="glass-panel empty-reports-box">
                  <h4>No claims filed</h4>
                  <p>When you spot a found item that belongs to you and claim it, status updates will show here.</p>
                </div>
              ) : (
                data.filed_claims.map((claim) => (
                  <div key={claim.id} className="dash-item-card glass-panel">
                    <div className="dash-item-header">
                      <div>
                        <h4>Claim #{claim.id} &mdash; Report #{claim.report_id}</h4>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <span
                            className={`badge ${
                              claim.status === 'approved'
                                ? 'badge-success'
                                : claim.status === 'rejected'
                                ? 'badge-danger'
                                : claim.status === 'more_info_needed'
                                ? 'badge-warning'
                                : 'badge-info'
                            }`}
                          >
                            {claim.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          {claim.queue_position && (
                            <span className="badge badge-info">
                              Queue: #{claim.queue_position}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onOpenReport(claim.report_id)}
                      >
                        Inspect Report
                      </button>
                    </div>

                    <div style={{ margin: '10px 0', fontSize: '0.88rem' }}>
                      <strong>Your Submitted Proof:</strong> {claim.ownership_proof}
                    </div>

                    {claim.admin_notes && (
                      <div
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          borderLeft: '3px solid var(--accent)',
                          padding: '8px 12px',
                          margin: '8px 0',
                          fontSize: '0.85rem',
                        }}
                      >
                        <strong>Administrator Note:</strong> {claim.admin_notes}
                      </div>
                    )}

                    {/* Needs info prompt */}
                    {claim.status === 'more_info_needed' && (
                      <div style={{ margin: '12px 0', padding: '12px', background: 'rgba(245,158,11,0.08)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '0.85rem', color: '#FCD34D', marginBottom: '8px' }}>
                          The administration requires additional ownership details before approving this claim.
                        </p>
                        {activeRespondId === claim.id ? (
                          <div>
                            <textarea
                              rows="3"
                              className="form-input"
                              placeholder="Provide additional details or serial numbers..."
                              value={additionalText}
                              onChange={(e) => setAdditionalText(e.target.value)}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={responding}
                                onClick={() => handleRespond(claim.id)}
                              >
                                {responding ? 'Submitting...' : 'Submit Response'}
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setActiveRespondId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => setActiveRespondId(claim.id)}
                          >
                            Respond to Administrator
                          </button>
                        )}
                      </div>
                    )}

                    {/* Approved Handover confirmation */}
                    {claim.status === 'approved' && !claim.receipt_confirmed && (
                      <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px' }}>
                        <p style={{ fontSize: '0.85rem', color: '#6EE7B7', marginBottom: '8px' }}>
                          Claim verified! When you meet the finder and physically collect your item, confirm below.
                        </p>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={confirmingReceiptId === claim.id}
                          onClick={() => handleConfirmReceipt(claim.id)}
                        >
                          {confirmingReceiptId === claim.id ? 'Confirming...' : 'Confirm Item Handover Receipt'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
