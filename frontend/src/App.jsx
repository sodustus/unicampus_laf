import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchHealth,
  fetchCategories,
  fetchReports,
  deleteReport,
  restoreReport,
  fetchMyClaims,
  fetchAllClaims,
} from './api/client';
import { useAuth } from './context/AuthContext';
import GlobalSidebar from './components/GlobalSidebar';
import { IconMenu } from './components/Icons';
import GuestLandingPage from './pages/GuestLandingPage';
import CampusFeedPage from './pages/CampusFeedPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import MyReportsPage from './pages/MyReportsPage';
import MyClaimsPage from './pages/MyClaimsPage';
import HandoversPage from './pages/HandoversPage';
import AdminHubPage from './pages/AdminHubPage';
import ProfilePage from './pages/ProfilePage';

// Action Modals (Retained Overlays)
import ReportModal from './components/ReportModal';
import ReportDetailModal from './components/ReportDetailModal';
import ClaimModal from './components/ClaimModal';
import FoundNoticeModal from './components/FoundNoticeModal';
import RecoveryDetailModal from './components/RecoveryDetailModal';
import ProfileModal from './components/ProfileModal';
import ActionDialogModal from './components/ActionDialogModal';

// Architecture Version: v9 | Public Display: v3.0
export const APP_INTERNAL_VERSION = 'v9';
export const APP_DISPLAY_VERSION = 'v3.0';
import './App.css';

export default function App() {
  const { token, isAuthenticated, isAdmin } = useAuth();

  // Navigation State
  const [activePage, setActivePage] = useState('feed');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Health probe state
  const [_healthData, setHealthData] = useState(null);

  // Reports, Categories & Filters state
  const [categories, setCategories] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [claimsCount, setClaimsCount] = useState(0);

  // Action Overlays State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalInitialData, setReportModalInitialData] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [claimReport, setClaimReport] = useState(null);
  const [foundNoticeReport, setFoundNoticeReport] = useState(null);
  const [recoveryReport, setRecoveryReport] = useState(null);
  const [profileModalConfig, setProfileModalConfig] = useState({
    isOpen: false,
    targetUserId: null,
    isSelfEdit: false,
  });
  const [dialogConfig, setDialogConfig] = useState(null);

  const [filters, setFilters] = useState({
    type: '',
    category_id: '',
    location: '',
    status: 'active',
    possession_status: '',
    q: '',
    sort: 'newest',
  });

  // Guard against non-admin staying on admin page routes
  useEffect(() => {
    if (activePage.startsWith('admin-') && !isAdmin) {
      setActivePage('feed');
    }
  }, [activePage, isAdmin]);

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
      if (categories.length === 0) {
        loadCategories();
      }
      const data = await fetchReports(filters, token);
      setReports(data || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [filters, token, categories.length]);

  const loadClaimsBadge = useCallback(async () => {
    if (!token) {
      setClaimsCount(0);
      return;
    }
    try {
      if (isAdmin) {
        const claims = await fetchAllClaims('pending', token);
        setClaimsCount(claims ? claims.length : 0);
      } else {
        const claims = await fetchMyClaims(token, 'filed');
        const active = (claims || []).filter(
          (c) => c.status === 'pending' || c.status === 'approved'
        );
        setClaimsCount(active.length);
      }
    } catch {
      setClaimsCount(0);
    }
  }, [token, isAdmin]);

  const checkStatus = async () => {
    try {
      const res = await fetchHealth();
      setHealthData(res);
    } catch {
      setHealthData(null);
    }
  };

  useEffect(() => {
    checkStatus();
    loadCategories();
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCategories();
      loadClaimsBadge();
    }
  }, [isAuthenticated, loadClaimsBadge]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReportCreated = (newReport) => {
    loadReports();
    setSelectedReportId(newReport.id);
  };

  const handleRecoverReport = (report) => {
    const target = typeof report === 'object' ? report : reports.find((r) => r.id === report);
    if (target) {
      setRecoveryReport(target);
    }
  };

  const handleDeleteReport = async (reportId, reason = null) => {
    if (!token) return;
    if (reason !== null) {
      try {
        await deleteReport(reportId, token, reason);
        loadReports();
      } catch (err) {
        alert(err.message || 'Failed to delete report');
      }
      return;
    }

    if (isAdmin) {
      setDialogConfig({
        title: 'Delete Report',
        message: 'Please provide a reason or duplicate reference for archiving this report:',
        needsInput: true,
        inputLabel: 'Reason for deletion (mandatory for admin)',
        inputPlaceholder: 'e.g. Duplicate of #14, spam, or resolved offline',
        confirmLabel: 'Delete',
        confirmVariant: 'danger',
        onConfirm: async (inputVal) => {
          setDialogConfig(null);
          try {
            await deleteReport(reportId, token, inputVal);
            loadReports();
          } catch (err) {
            alert(err.message || 'Failed to delete report');
          }
        },
      });
    } else {
      setDialogConfig({
        title: 'Delete Report',
        message: 'Are you sure you want to remove this report? It will be archived and hidden from campus listings.',
        needsInput: false,
        confirmLabel: 'Delete',
        confirmVariant: 'danger',
        onConfirm: async () => {
          setDialogConfig(null);
          try {
            await deleteReport(reportId, token, null);
            loadReports();
          } catch (err) {
            alert(err.message || 'Failed to delete report');
          }
        },
      });
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
    setClaimReport(report);
  };

  const handleOpenFoundNotice = (report) => {
    setFoundNoticeReport(report);
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

  // 1. Unauthenticated Visitor Experience: Clean Hero Banner + In-Page Authentication
  if (!isAuthenticated) {
    return (
      <GuestLandingPage
        onLoginSuccess={() => {
          setActivePage('feed');
          loadCategories();
          loadReports();
        }}
      />
    );
  }

  // 2. Authenticated Application Shell: Global Sidebar + TopBar + Dedicated Page Viewport
  return (
    <div className="app-shell">
      {/* Persistent Left Sidebar Navigation */}
      <GlobalSidebar
        activePage={activePage}
        onNavigate={(page) => {
          setActivePage(page);
          if (page === 'feed') loadReports();
        }}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        claimsCount={claimsCount}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Viewport Container */}
      <div className="main-viewport">
        {/* Mobile Header Bar (Screen <= 1024px) */}
        <div className="mobile-header-bar">
          <button
            type="button"
            className="mobile-menu-trigger"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Open navigation menu"
            title="Open Menu"
          >
            <IconMenu size={20} />
            <span>Menu</span>
          </button>
          <span className="mobile-brand-title">UniCampus LAF</span>
        </div>

        <main className="page-body">
          {activePage === 'feed' && (
            <CampusFeedPage
              reports={reports}
              loadingReports={loadingReports}
              filters={filters}
              onFilterChange={handleFilterChange}
              categories={categories}
              onOpenReportModal={() => setIsReportModalOpen(true)}
              onSelectReport={(rep) => setSelectedReportId(rep.id)}
              onRecoverReport={handleRecoverReport}
              onDeleteReport={handleDeleteReport}
              onViewProfile={handleViewMemberProfile}
            />
          )}

          {activePage === 'dashboard' && (
            <StudentDashboardPage
              onNavigate={(page) => setActivePage(page)}
              onOpenReport={(repId) => setSelectedReportId(repId)}
              onRecoverReport={handleRecoverReport}
              onDeleteReport={handleDeleteReport}
              onOpenReportModal={() => setIsReportModalOpen(true)}
              onSelectClaimReport={(claim) => {
                if (claim.report_id) setSelectedReportId(claim.report_id);
              }}
            />
          )}

          {activePage === 'my-reports' && (
            <MyReportsPage
              onOpenReport={(repId) => setSelectedReportId(repId)}
              onRecoverReport={handleRecoverReport}
              onDeleteReport={handleDeleteReport}
              onOpenReportModal={() => setIsReportModalOpen(true)}
            />
          )}

          {(activePage === 'my-claims' || activePage === 'claims') && (
            <MyClaimsPage
              onOpenReport={(repId) => setSelectedReportId(repId)}
              onNavigateToHandovers={() => setActivePage('handovers')}
              onOpenClaimReport={(rep) => setClaimReport(rep)}
              onRegisterFoundReport={(initialData) => {
                setReportModalInitialData(initialData);
                setIsReportModalOpen(true);
              }}
            />
          )}

          {activePage === 'handovers' && (
            <HandoversPage
              onOpenReport={(repId) => setSelectedReportId(repId)}
              onViewProfile={handleViewMemberProfile}
            />
          )}

          {activePage.startsWith('admin-') && isAdmin && (
            <AdminHubPage
              activeSubTab={activePage.replace('admin-', '')}
              onNavigateSubTab={(tab) => setActivePage('admin-' + tab)}
              onOpenReport={(repId) => setSelectedReportId(repId)}
              onRestoreReport={handleRestoreReport}
              onViewProfile={handleViewMemberProfile}
              onSelectClaimReport={(claim) => {
                if (claim.report_id) setSelectedReportId(claim.report_id);
              }}
            />
          )}

          {activePage === 'profile' && <ProfilePage />}

          <footer className="footer-bar">
            <p>
              UniCampus Lost & Found System v3.0 &bull; Abdurezak Anwar, 2026
            </p>
          </footer>
        </main>
      </div>

      {/* Retained Action Modals (Transient Focus Overlays) */}
      <ReportModal
        isOpen={isReportModalOpen}
        initialData={reportModalInitialData}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportModalInitialData(null);
        }}
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
          setActivePage('claims');
          loadReports();
          loadClaimsBadge();
        }}
      />

      <RecoveryDetailModal
        isOpen={Boolean(recoveryReport)}
        report={recoveryReport}
        onClose={() => setRecoveryReport(null)}
        onRecovered={() => {
          loadReports();
          loadClaimsBadge();
        }}
      />

      <ProfileModal
        isOpen={profileModalConfig.isOpen}
        onClose={handleCloseProfileModal}
        targetUserId={profileModalConfig.targetUserId}
        isSelfEdit={profileModalConfig.isSelfEdit}
      />

      <ActionDialogModal
        isOpen={Boolean(dialogConfig)}
        {...dialogConfig}
        onClose={() => setDialogConfig(null)}
      />
    </div>
  );
}
