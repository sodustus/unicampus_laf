import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchHealth,
  fetchCategories,
  fetchReports,
  markReportRecovered,
  deleteReport,
} from './api/client';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import ReportModal from './components/ReportModal';
import ReportCard from './components/ReportCard';
import ReportDetailModal from './components/ReportDetailModal';
import SearchFilters from './components/SearchFilters';
import './App.css';

export default function App() {
  const { user, token, isAuthenticated, isAdmin, logout, checkAdminAccess, quickLogin } = useAuth();
  
  // Health probe state
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [latency, setLatency] = useState(null);

  // Auth & Admin test state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [adminTestResult, setAdminTestResult] = useState(null);
  const [adminTesting, setAdminTesting] = useState(false);

  // Step 3 & 4: Reports, Categories & Filters state
  const [categories, setCategories] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [filters, setFilters] = useState({
    type: '',
    category_id: '',
    location: '',
    status: 'active',
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

  const handleRecoverReport = async (reportId) => {
    if (!token) return;
    try {
      await markReportRecovered(reportId, token);
      loadReports();
    } catch (err) {
      alert(err.message || 'Failed to mark report recovered');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteReport(reportId, token);
      loadReports();
    } catch (err) {
      alert(err.message || 'Failed to delete report');
    }
  };

  const handleClaimItem = (report) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    alert(`Claim workflow initiated for item #${report.id} (${report.title}). Proceeding to Step 5 (Claims & Verification)!`);
  };

  const handleTestAdminRoute = async () => {
    setAdminTesting(true);
    try {
      const result = await checkAdminAccess();
      setAdminTestResult(result);
    } catch (err) {
      setAdminTestResult({
        status: 401,
        ok: false,
        data: { detail: err.message },
      });
    } finally {
      setAdminTesting(false);
    }
  };

  const isBackendOnline = healthData?.success && healthData?.data?.status === 'online';
  const isDbConnected = healthData?.data?.database?.status === 'connected';

  const roadmapSteps = [
    { num: 1, title: 'Skeleton', desc: 'React app, FastAPI app, and PostgreSQL connected', status: 'completed' },
    { num: 2, title: 'Accounts & Auth', desc: 'Register, login, logout with user and admin roles (Argon2id + JWT)', status: 'completed' },
    { num: 3, title: 'Report CRUD', desc: 'Lost and found item reporting (shared table with type field & privacy boundary)', status: 'completed' },
    { num: 4, title: 'Browse & Search', desc: 'Filter by type, category, location, status, keyword search, and sorting', status: 'completed' },
    { num: 5, title: 'Claims & Review', desc: 'Ownership verification submission, review loop, and admin decision', status: 'current' },
    { num: 6, title: 'Recovery & Audit', desc: 'Handover confirmation, return status, and immutable audit logs', status: 'upcoming' },
    { num: 7, title: 'Dashboards', desc: 'Dedicated views for students/staff and administrators', status: 'upcoming' },
  ];

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
              <div className="user-chip">
                <div className="user-avatar">{user.email[0].toUpperCase()}</div>
                <span className="user-email">{user.email}</span>
                <span className={`badge ${isAdmin ? 'badge-role-admin' : 'badge-role-user'}`}>
                  {isAdmin ? '🛡️ Administrator' : '👤 Student / Staff'}
                </span>
              </div>
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
                />
              ))}
            </div>
          )}
        </section>

        {/* Step 2: Live Role-Based Authorization Proof Card */}
        <section className="glass-panel auth-security-card">
          <div className="auth-security-header">
            <div>
              <h3>🛡️ Role-Based Access Control Proof (FR-AUTH-07 & NFR-02)</h3>
              <p className="security-hint">
                Tests server-side authorization directly. Regular users are strictly rejected with <strong>HTTP 403 Forbidden</strong>; 
                only accounts with the <strong>admin</strong> role are granted access to restricted operations.
              </p>
            </div>
            <div className="demo-btns" style={{ minWidth: '320px' }}>
              <button
                type="button"
                className="btn btn-demo-user"
                onClick={() => quickLogin('student')}
              >
                👤 Switch to Student
              </button>
              <button
                type="button"
                className="btn btn-demo-admin"
                onClick={() => quickLogin('admin')}
              >
                🛡️ Switch to Admin
              </button>
            </div>
          </div>

          <div className="security-results-box">
            <div className="security-result-row">
              <span>Active Session:</span>
              {isAuthenticated ? (
                <span className="badge badge-info">
                  {user.email} &bull; <strong>{user.role.toUpperCase()}</strong>
                </span>
              ) : (
                <span className="badge badge-warning">Unauthenticated (Guest)</span>
              )}
              <button
                className="btn btn-secondary security-test-btn"
                onClick={handleTestAdminRoute}
                disabled={adminTesting || !isAuthenticated}
              >
                {adminTesting ? 'Testing Server Route...' : '⚡ Probe Admin-Only Route (/auth/admin-check)'}
              </button>
            </div>

            {adminTestResult && (
              <div className="security-result-row" style={{ marginTop: '8px' }}>
                <span>Backend Response:</span>
                {adminTestResult.ok ? (
                  <span className="badge badge-success">
                    HTTP 200 OK &bull; Access Granted ({adminTestResult.data.message})
                  </span>
                ) : (
                  <span className="badge badge-danger">
                    HTTP {adminTestResult.status} {adminTestResult.status === 403 ? 'Forbidden' : 'Unauthorized'} &bull; 
                    {adminTestResult.data.detail}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 3-Tier Status Grid */}
        <section className="status-grid">
          {/* Frontend Card */}
          <div className="glass-panel service-card">
            <div className="service-card-header">
              <div className="service-title-wrap">
                <span className="service-icon">⚡</span>
                <div>
                  <h3>Frontend</h3>
                  <span className="service-tech">React 19 + Vite</span>
                </div>
              </div>
              <span className="badge badge-success">
                <span className="pulse-dot online"></span>
                Active
              </span>
            </div>
            <p className="service-desc">
              Search, filters, reporting dialogs, and detail modals with privacy protection.
            </p>
            <div className="service-meta">
              <span>Port: <strong>5173</strong></span>
              <span>Proxy: <strong>/api &rarr; 8000</strong></span>
            </div>
          </div>

          {/* Backend Card */}
          <div className="glass-panel service-card">
            <div className="service-card-header">
              <div className="service-title-wrap">
                <span className="service-icon">🐍</span>
                <div>
                  <h3>Backend API</h3>
                  <span className="service-tech">Python + FastAPI</span>
                </div>
              </div>
              <span className={`badge ${isBackendOnline ? 'badge-success' : 'badge-danger'}`}>
                <span className={`pulse-dot ${isBackendOnline ? 'online' : 'offline'}`}></span>
                {isBackendOnline ? 'Healthy' : 'Unreachable'}
              </span>
            </div>
            <p className="service-desc">
              Report CRUD, categories, and query parameters for full-text search and filtering.
            </p>
            <div className="service-meta">
              <span>Port: <strong>8000</strong></span>
              <span>Endpoints: <code>/reports</code></span>
            </div>
          </div>

          {/* Database Card */}
          <div className="glass-panel service-card">
            <div className="service-card-header">
              <div className="service-title-wrap">
                <span className="service-icon">🐘</span>
                <div>
                  <h3>Database</h3>
                  <span className="service-tech">PostgreSQL 18</span>
                </div>
              </div>
              <span className={`badge ${isDbConnected ? 'badge-success' : 'badge-warning'}`}>
                <span className={`pulse-dot ${isDbConnected ? 'online' : 'warning'}`}></span>
                {isDbConnected ? 'Connected' : 'Pending'}
              </span>
            </div>
            <p className="service-desc">
              Shared `reports` table with soft delete and `categories` relational mapping.
            </p>
            <div className="service-meta">
              <span>Port: <strong>5432</strong></span>
              <span>DB: <strong>unicampus_laf</strong></span>
            </div>
          </div>
        </section>

        {/* Step-by-Step Implementation Roadmap */}
        <section className="glass-panel roadmap-section">
          <div className="roadmap-header">
            <h2>Development Roadmap (Per SRS Specifications)</h2>
            <p>Each phase is built as an independent, fully tested vertical slice.</p>
          </div>

          <div className="roadmap-list">
            {roadmapSteps.map((step) => (
              <div
                key={step.num}
                className={`roadmap-item ${
                  step.status === 'completed'
                    ? 'is-completed'
                    : step.status === 'current'
                    ? 'is-current'
                    : ''
                }`}
              >
                <div
                  className="step-badge"
                  style={step.status === 'completed' ? { background: '#10B981', color: '#FFF' } : {}}
                >
                  {step.status === 'completed' ? '✓' : step.num}
                </div>
                <div className="step-info">
                  <div className="step-header">
                    <h4>{step.title}</h4>
                    {step.status === 'completed' && (
                      <span className="badge badge-success">Done</span>
                    )}
                    {step.status === 'current' && (
                      <span className="badge badge-info">Next Up</span>
                    )}
                  </div>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>UniCampus Lost & Found System &bull; Graduation Project Build &bull; Clean Architecture</p>
      </footer>

      {/* Modals */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onReportCreated={handleReportCreated}
      />
      <ReportDetailModal
        reportId={selectedReportId}
        onClose={() => setSelectedReportId(null)}
        onRecover={handleRecoverReport}
        onDelete={handleDeleteReport}
        onClaim={handleClaimItem}
      />
    </div>
  );
}
