import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchHealth,
  fetchCategories,
  fetchReports,
  markReportRecovered,
  deleteReport,
  restoreReport,
} from './api/client';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import ReportModal from './components/ReportModal';
import ReportCard from './components/ReportCard';
import ReportDetailModal from './components/ReportDetailModal';
import SearchFilters from './components/SearchFilters';
import ClaimModal from './components/ClaimModal';
import ClaimsManagerModal from './components/ClaimsManagerModal';
import RecoveryDetailModal from './components/RecoveryDetailModal';
import UserDashboardModal from './components/UserDashboardModal';
import AdminDashboardModal from './components/AdminDashboardModal';
import ProfileModal from './components/ProfileModal';
import FoundNoticeModal from './components/FoundNoticeModal';
import './App.css';

export default function App() {
  const { user, token, isAuthenticated, isAdmin, logout } = useAuth();
  
  // Health probe state
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [latency, setLatency] = useState(null);

  // Auth & Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Step 3 & 4: Reports, Categories & Filters state
  const [categories, setCategories] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);
  
  // Step 5: Claims & Verification state
  const [claimReport, setClaimReport] = useState(null);
  const [isClaimsManagerOpen, setIsClaimsManagerOpen] = useState(false);

  // Step 6 & 7: Recovery, User & Admin Dashboards state
  const [recoveryReport, setRecoveryReport] = useState(null);
  const [isUserDashboardOpen, setIsUserDashboardOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // Issue #2: Student Profile modal state
  const [profileModalConfig, setProfileModalConfig] = useState({
    isOpen: false,
    targetUserId: null,
    isSelfEdit: false,
  });

  // Issue #7: Lost item found notice modal state
  const [foundNoticeReport, setFoundNoticeReport] = useState(null);

  const handleOpenSelfProfile = () => {
    setProfileModalConfig({
      isOpen: true,
      targetUserId: user?.id,
      isSelfEdit: true,
    });
  };

  const handleViewMemberProfile = (userId) => {
    setProfileModalConfig({
      isOpen: true,
      targetUserId: userId,
      isSelfEdit: false,
    });
  };

  const handleCloseProfileModal = () => {
    setProfileModalConfig({
      isOpen: false,
      targetUserId: null,
      isSelfEdit: false,
    });
  };

  const handleOpenFoundNotice = (report) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setFoundNoticeReport(report);
  };

  const [filters, setFilters] = useState({
    type: '',
    category_id: '',
    location: '',
    status: 'active',
    possession_status: '',
    q: '',
    sort: 'newest',
  });

  const checkStatus = async () => {
    setLoadingHealth(true);
    const res = await fetchHealth();
    setHealthData(res);
    setLatency(res.latency);
    setLastChecked(new Date().toLocaleTimeString());
    setLoadingHealth(false);
  };

  const loadCategories = async () => {
    try {
      const cats = await fetchCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const data = await fetchReports(filters, token);
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [filters, token]);

  useEffect(() => {
    checkStatus();
    loadCategories();
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReportCreated = (newReport) => {
    loadReports();
    // Prompt view of newly created report
    setSelectedReportId(newReport.id);
  };

  const handleRecoverReport = (report) => {
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }
    const target = typeof report === 'object' ? report : reports.find((r) => r.id === report);
    if (target) {
      setRecoveryReport(target);
    }
  };

  const handleDeleteReport = async (reportId, reason = null) => {
    if (!token) return;
    let delReason = reason;
    if (delReason === null) {
      if (isAdmin) {
        delReason = window.prompt('Reason for deletion / duplicate reference (e.g. "Duplicate of #14"):', '');
        if (delReason === null) return; // user cancelled prompt
      } else {
        if (!window.confirm('Are you sure you want to delete this report?')) return;
      }
    }
    try {
      await deleteReport(reportId, token, delReason);
      loadReports();
    } catch (err) {
      alert(err.message || 'Failed to delete report');
    }
  };

  const handleRestoreReport = async (reportId) => {
    if (!token) return;
    try {
      await restoreReport(reportId, token);
      loadReports();
    } catch (err) {
      alert(err.message || 'Failed to restore report');
    }
  };

  const handleClaimItem = (report) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setClaimReport(report);
  };

  const isBackendOnline = healthData?.success && healthData?.data?.status === 'online';

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <header className="navbar glass-panel">
        <div className="brand-group">
          <div className="brand-icon">🎓</div>
          <div>
            <h1 className="brand-title">UniCampus LAF</h1>
            <p className="brand-subtitle">Campus Lost & Found Management System</p>
          </div>
        </div>

        <div className="nav-badges">
          {isAuthenticated ? (
            <div className="user-profile-group">
              <div
                className="user-chip"
                onClick={handleOpenSelfProfile}
                style={{ cursor: 'pointer' }}
                title="Click to view/edit your profile"
              >
                <div className="user-avatar">
                  {(user.full_name || user.email)[0].toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <span className="user-email" style={{ fontWeight: 600 }}>
                    {user.full_name || user.email}
                  </span>
                  {user.department && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {user.department}
                    </span>
                  )}
                </div>
                <span className={`badge ${isAdmin ? 'badge-role-admin' : 'badge-role-user'}`}>
                  {isAdmin ? '🛡️ Admin' : '👤 Student'}
                </span>
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleOpenSelfProfile}
                title="Edit your contact details and profile"
              >
                👤 Profile
              </button>
              {isAdmin ? (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsAdminDashboardOpen(true)}
                  >
                    🛡️ Admin Console
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setIsClaimsManagerOpen(true)}
                  >
                    Claims Review
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsUserDashboardOpen(true)}
                  >
                    📊 My Dashboard
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setIsClaimsManagerOpen(true)}
                  >
                    📋 My Claims
                  </button>
                </>
              )}
              <button className="btn btn-secondary" onClick={logout}>
                Sign Out
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => setIsAuthModalOpen(true)}>
              🔐 Sign In / Register
            </button>
          )}

          <span className={`badge ${isBackendOnline ? 'badge-success' : 'badge-warning'}`}>
            <span className={`pulse-dot ${isBackendOnline ? 'online' : 'warning'}`}></span>
            {isBackendOnline ? 'System Online' : 'API Connecting...'}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Step 4: Search & Filters Toolbar */}
        <SearchFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          categories={categories}
          onOpenReportModal={() => {
            if (!isAuthenticated) {
              setIsAuthModalOpen(true);
            } else {
              setIsReportModalOpen(true);
            }
          }}
        />

        {/* Step 3 & 4: Live Reports Grid */}
        <section className="reports-section">
          <div className="reports-header-row">
            <h3>
              Campus Listings{' '}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                ({reports.length} {reports.length === 1 ? 'item' : 'items'} found)
              </span>
            </h3>
            <span className="badge badge-info">
              {filters.type ? `${filters.type.toUpperCase()} ITEMS` : 'ALL REPORTS'}
            </span>
          </div>

          {loadingReports ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading campus listings...
            </div>
          ) : reports.length === 0 ? (
            <div className="glass-panel empty-reports-box">
              <span className="empty-icon">📭</span>
              <h4 className="empty-title">No reports match your filters</h4>
              <p className="empty-subtitle">
                Try clearing your search query or switching categories, or be the first to post a lost/found report!
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!isAuthenticated) setIsAuthModalOpen(true);
                  else setIsReportModalOpen(true);
                }}
              >
                ➕ Post a Report Now
              </button>
            </div>
          ) : (
            <div className="reports-grid">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onSelect={(r) => setSelectedReportId(r.id)}
                  onRecover={handleRecoverReport}
                  onDelete={handleDeleteReport}
                  onViewProfile={handleViewMemberProfile}
                />
              ))}
            </div>
          )}
        </section>

      </main>

      <footer className="footer">
        <p>UniCampus Lost & Found System &bull; Graduation Project Build v7.1 &bull; Abdurezak Anwar, 2026</p>
      </footer>

      {/* Modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onReportCreated={handleReportCreated}
        onInspectMatchingReport={(repId) => {
          setSelectedReportId(repId);
          setIsReportModalOpen(false);
        }}
      />
      <ReportDetailModal
        reportId={selectedReportId}
        onClose={() => setSelectedReportId(null)}
        onRecover={handleRecoverReport}
        onDelete={handleDeleteReport}
        onRestore={handleRestoreReport}
        onClaim={handleClaimItem}
        onViewProfile={handleViewMemberProfile}
        onFoundNotice={handleOpenFoundNotice}
      />
      <FoundNoticeModal
        isOpen={Boolean(foundNoticeReport)}
        report={foundNoticeReport}
        onClose={() => setFoundNoticeReport(null)}
        onSuccess={(updatedReport) => {
          setFoundNoticeReport(null);
          loadReports();
          setSelectedReportId(updatedReport.id);
        }}
      />
      <ClaimModal
        isOpen={Boolean(claimReport)}
        report={claimReport}
        onClose={() => setClaimReport(null)}
        onClaimSubmitted={() => {
          setClaimReport(null);
          setIsClaimsManagerOpen(true);
        }}
      />
      <ClaimsManagerModal
        isOpen={isClaimsManagerOpen}
        onClose={() => setIsClaimsManagerOpen(false)}
        onHandoverCompleted={() => {
          loadReports();
        }}
        onOpenClaimReport={(rep) => {
          setClaimReport(rep);
        }}
      />
      <RecoveryDetailModal
        isOpen={Boolean(recoveryReport)}
        report={recoveryReport}
        onClose={() => setRecoveryReport(null)}
        onRecovered={() => {
          loadReports();
        }}
      />
      <UserDashboardModal
        isOpen={isUserDashboardOpen}
        onClose={() => setIsUserDashboardOpen(false)}
        onOpenReport={(repId) => {
          setSelectedReportId(repId);
        }}
        onRecoverReport={(rep) => {
          setRecoveryReport(rep);
        }}
        onDeleteReport={handleDeleteReport}
      />
      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        onOpenReport={(repId) => {
          setSelectedReportId(repId);
        }}
        onRestoreReport={handleRestoreReport}
        onOpenClaimsManager={() => {
          setIsAdminDashboardOpen(false);
          setIsClaimsManagerOpen(true);
        }}
      />
      <ProfileModal
        isOpen={profileModalConfig.isOpen}
        onClose={handleCloseProfileModal}
        targetUserId={profileModalConfig.targetUserId}
        isSelfEdit={profileModalConfig.isSelfEdit}
      />
    </div>
  );
}
