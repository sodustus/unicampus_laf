import React, { useState, useEffect, useCallback } from 'react';
import { fetchUserDashboard, respondToClaimInfo, confirmClaimReceipt } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { IconPlus, IconAlert } from '../components/Icons';
import ActionDialogModal from '../components/ActionDialogModal';

export default function StudentDashboardPage({
  onNavigate,
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
  const [dialogConfig, setDialogConfig] = useState(null);

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

  const handleConfirmReceipt = (claimId) => {
    setDialogConfig({
      title: 'Confirm Physical Receipt',
      message: 'Are you sure you have physically met and received your item back in good condition?',
      confirmLabel: 'Confirm Receipt',
      confirmVariant: 'success',
      onConfirm: async () => {
        setDialogConfig(null);
        setConfirmingReceiptId(claimId);
        try {
          await confirmClaimReceipt(claimId, token);
          await loadData();
        } catch (err) {
          alert(err.message || 'Failed to confirm item receipt');
        } finally {
          setConfirmingReceiptId(null);
        }
      },
    });
  };

  const stats = data?.stats || {
    active_reports_count: 0,
    recovered_reports_count: 0,
    total_claims_count: 0,
    action_required_claims_count: 0,
  };

  const activeReports = data?.active_reports || [];
  const recoveredReports = data?.recovered_reports || [];
  const filedClaims = data?.my_claims || data?.filed_claims || [];

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

      {/* Action Required Banner */}
      {stats.action_required_claims_count > 0 && (
        <div style={{ marginTop: '16px', padding: '14px 18px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FCD34D', fontWeight: 700 }}>
            <IconAlert size={20} />
            <span>Action Required: You have {stats.action_required_claims_count} claim(s) awaiting your additional information!</span>
          </div>
          {onNavigate && (
            <button
              type="button"
              className="btn btn-warning btn-sm"
              onClick={() => onNavigate('my-claims')}
            >
              Respond in My Claims
            </button>
          )}
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="kpi-grid" style={{ marginTop: '16px' }}>
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
      <div className="dashboard-tab-bar" style={{ marginTop: '20px' }}>
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
              {activeReports.length === 0 ? (
                <div className="glass-panel empty-reports-box">
                  <h4>No active reports found</h4>
                  <p>You currently have no open lost or found reports on campus.</p>
                </div>
              ) : (
                activeReports.map((rep) => (
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
              {recoveredReports.length === 0 ? (
                <div className="glass-panel empty-reports-box">
                  <h4>No recovered reports yet</h4>
                  <p>Items you successfully recover or mark resolved will be archived here.</p>
                </div>
              ) : (
                recoveredReports.map((rep) => (
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
              {filedClaims.length === 0 ? (
                <div className="glass-panel empty-reports-box">
                  <h4>No claims filed</h4>
                  <p>When you spot a found item that belongs to you and claim it, status updates will show here.</p>
                </div>
              ) : (
                filedClaims.map((claim) => {
                  const needsInfo = claim.status === 'awaiting_info' || claim.status === 'more_info_needed';
                  const isApproved = claim.status === 'approved';
                  const isClaimOwner = user && (claim.owner?.id === user.id || (!claim.owner && (claim.report?.type === 'lost' ? claim.report?.owner_id === user.id : claim.claimant_id === user.id)));
                  const needsReceipt = isApproved && isClaimOwner && !claim.owner_confirmed_receipt && !claim.receipt_confirmed;

                  return (
                    <div key={claim.id} className="dash-item-card glass-panel">
                      <div className="dash-item-header">
                        <div>
                          <h4>Claim #{claim.id} &mdash; Report #{claim.report_id}</h4>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span
                              className={`badge ${
                                isApproved
                                  ? 'badge-success'
                                  : claim.status === 'rejected'
                                  ? 'badge-danger'
                                  : needsInfo
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
                        <strong>Your Submitted Proof:</strong> {claim.verification_record?.proof_details || claim.ownership_proof || '(Proof details attached)'}
                      </div>

                      {claim.admin_notes && (
                        <div
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            borderLeft: '3px solid var(--primary)',
                            padding: '8px 12px',
                            margin: '8px 0',
                            fontSize: '0.85rem',
                          }}
                        >
                          <strong>Administrator Note:</strong> {claim.admin_notes}
                        </div>
                      )}

                      {/* Needs info prompt */}
                      {needsInfo && (
                        <div style={{ margin: '12px 0', padding: '12px', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.25)' }}>
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
                      {needsReceipt && (
                        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.25)' }}>
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
                  );
                })
              )}
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
