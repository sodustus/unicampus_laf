import React, { useState, useEffect } from 'react';
import { fetchUserDashboard, respondToClaimInfo } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function UserDashboardModal({
  isOpen,
  onClose,
  onOpenReport,
  onRecoverReport,
  onDeleteReport,
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

  const loadData = async () => {
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
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

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

  const stats = data?.stats || {
    active_reports_count: 0,
    recovered_reports_count: 0,
    total_claims_count: 0,
    action_required_claims_count: 0,
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog glass-panel dashboard-dialog"
        style={{ maxWidth: '900px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">📊</span>
            <div>
              <h3>My Campus Dashboard</h3>
              <p className="modal-subtitle">
                Logged in as <strong>{user?.email}</strong> &bull; Personalized Lost & Found Activity
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Dashboard KPI Summary Cards (FR-DASH-U) */}
        <div className="kpi-grid">
          <div className="kpi-card" onClick={() => setActiveTab('active')}>
            <span className="kpi-icon">📋</span>
            <div className="kpi-info">
              <span className="kpi-val">{stats.active_reports_count}</span>
              <span className="kpi-label">Active Reports</span>
            </div>
          </div>

          <div className="kpi-card" onClick={() => setActiveTab('recovered')}>
            <span className="kpi-icon">🎉</span>
            <div className="kpi-info">
              <span className="kpi-val">{stats.recovered_reports_count}</span>
              <span className="kpi-label">Recovered Items</span>
            </div>
          </div>

          <div className="kpi-card" onClick={() => setActiveTab('claims')}>
            <span className="kpi-icon">🤝</span>
            <div className="kpi-info">
              <span className="kpi-val">{stats.total_claims_count}</span>
              <span className="kpi-label">Claims Filed</span>
            </div>
          </div>

          <div className="kpi-card" onClick={() => setActiveTab('claims')}>
            <span className="kpi-icon">⚠️</span>
            <div className="kpi-info">
              <span className="kpi-val" style={{ color: stats.action_required_claims_count > 0 ? '#F59E0B' : '#10B981' }}>
                {stats.action_required_claims_count}
              </span>
              <span className="kpi-label">Needs Response</span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="dashboard-tab-bar">
          <button
            className={`dashboard-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            📋 Active Reports ({stats.active_reports_count})
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'recovered' ? 'active' : ''}`}
            onClick={() => setActiveTab('recovered')}
          >
            🎉 Recovered History ({stats.recovered_reports_count})
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'claims' ? 'active' : ''}`}
            onClick={() => setActiveTab('claims')}
          >
            🤝 My Claims Tracker ({stats.total_claims_count})
          </button>
        </div>

        {error && <div className="alert-error" style={{ margin: '14px 0' }}>{error}</div>}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading dashboard records...
          </div>
        ) : (
          <div className="dashboard-content-body">
            {/* 1. Active Reports Tab */}
            {activeTab === 'active' && (
              <div className="dashboard-list">
                {data.active_reports.length === 0 ? (
                  <div className="empty-reports-box">
                    <span className="empty-icon">📭</span>
                    <h4>No active reports found</h4>
                    <p>You currently have no open lost or found reports on campus.</p>
                  </div>
                ) : (
                  data.active_reports.map((rep) => (
                    <div key={rep.id} className="dash-item-card">
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
                        <span className="dash-item-meta">📍 {rep.location} &bull; 📅 {new Date(rep.item_date).toLocaleDateString()}</span>
                        <div className="dash-item-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => onOpenReport(rep.id)}>
                            Inspect
                          </button>
                          {rep.type === 'lost' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                onRecoverReport(rep);
                                onClose();
                              }}
                            >
                              ✓ Mark Recovered
                            </button>
                          )}
                          <button
                            className="btn btn-delete btn-sm"
                            onClick={() => {
                              onDeleteReport(rep.id);
                              loadData();
                            }}
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

            {/* 2. Recovered Reports Tab */}
            {activeTab === 'recovered' && (
              <div className="dashboard-list">
                {data.recovered_reports.length === 0 ? (
                  <div className="empty-reports-box">
                    <span className="empty-icon">🌱</span>
                    <h4>No recovered items yet</h4>
                    <p>Once your items are marked recovered or closed, they will appear here with full recovery records.</p>
                  </div>
                ) : (
                  data.recovered_reports.map((rep) => (
                    <div key={rep.id} className="dash-item-card recovered-border">
                      <div className="dash-item-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-success">✓ RECOVERED</span>
                          <h4>{rep.title}</h4>
                        </div>
                        <span className="badge badge-info">#{rep.id}</span>
                      </div>
                      <p className="dash-item-desc">{rep.description}</p>
                      <div className="dash-item-footer">
                        <span className="dash-item-meta">📍 {rep.location} &bull; Recovered</span>
                        <div className="dash-item-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => onOpenReport(rep.id)}>
                            View Recovery Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. My Claims Tracker Tab */}
            {activeTab === 'claims' && (
              <div className="dashboard-list">
                {data.my_claims.length === 0 ? (
                  <div className="empty-reports-box">
                    <span className="empty-icon">🤝</span>
                    <h4>No claims filed</h4>
                    <p>You haven't filed any ownership claims for found campus items.</p>
                  </div>
                ) : (
                  data.my_claims.map((claim) => (
                    <div key={claim.id} className="dash-item-card">
                      <div className="dash-item-header">
                        <div>
                          <h4>Claim for Found Item #{claim.report_id}</h4>
                          <span className="claim-card-meta">
                            Claim #{claim.id} &bull; Filed {new Date(claim.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={`badge badge-status-${claim.status}`}>
                          {claim.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      <div className="claim-history-timeline" style={{ margin: '10px 0' }}>
                        <div className="claim-history-entry">
                          <strong>My Submitted Proof:</strong>
                          <span>{claim.verification_record?.proof_details || 'No proof submitted'}</span>
                        </div>

                        {claim.verification_record?.additional_info && (
                          <div className="claim-history-entry">
                            <strong>Additional Verification Provided:</strong>
                            <span>{claim.verification_record.additional_info}</span>
                          </div>
                        )}
                      </div>

                      {claim.status === 'awaiting_info' && (
                        <div className="claim-respond-box" style={{ marginTop: '8px' }}>
                          <p style={{ fontSize: '0.8125rem', color: '#FBBF24', margin: '0 0 6px 0' }}>
                            ⚠️ Reviewers requested additional proof to verify your ownership.
                          </p>
                          {activeRespondId === claim.id ? (
                            <>
                              <textarea
                                rows="3"
                                placeholder="Enter specific identifiers, receipt details, or distinctive characteristics..."
                                value={additionalText}
                                onChange={(e) => setAdditionalText(e.target.value)}
                              />
                              <div className="claim-prompt-actions">
                                <button className="btn btn-secondary btn-sm" onClick={() => setActiveRespondId(null)}>
                                  Cancel
                                </button>
                                <button
                                  className="btn btn-primary btn-sm"
                                  disabled={responding || !additionalText.trim()}
                                  onClick={() => handleRespond(claim.id)}
                                >
                                  {responding ? 'Submitting...' : 'Submit Proof'}
                                </button>
                              </div>
                            </>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setActiveRespondId(claim.id);
                                setAdditionalText('');
                              }}
                            >
                              ✍️ Provide Additional Information
                            </button>
                          )}
                        </div>
                      )}

                      {claim.status === 'rejected' && claim.rejection_reason && (
                        <div className="claim-rejection-box" style={{ marginTop: '8px' }}>
                          <strong>Rejection Reason:</strong> {claim.rejection_reason}
                        </div>
                      )}

                      {claim.status === 'completed' && (
                        <div className="badge badge-success" style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
                          ✓ Handover Completed & Verified
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
    </div>
  );
}
