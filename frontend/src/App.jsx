import React, { useState, useEffect } from 'react';
import { fetchHealth } from './api/client';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import './App.css';

export default function App() {
  const { user, isAuthenticated, isAdmin, logout, checkAdminAccess, quickLogin } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [latency, setLatency] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [adminTestResult, setAdminTestResult] = useState(null);
  const [adminTesting, setAdminTesting] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    const res = await fetchHealth();
    setHealthData(res);
    setLatency(res.latency);
    setLastChecked(new Date().toLocaleTimeString());
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, []);

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
    { num: 2, title: 'Accounts & Auth', desc: 'Register, login, logout with user and admin roles (Argon2 + JWT)', status: 'completed' },
    { num: 3, title: 'Report CRUD', desc: 'Lost and found item reporting (shared table with type field)', status: 'current' },
    { num: 4, title: 'Browse & Search', desc: 'Filter by category, location, status, and keywords', status: 'upcoming' },
    { num: 5, title: 'Claims & Review', desc: 'Ownership verification submission, review loop, and approval', status: 'upcoming' },
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
        {/* Hero Section */}
        <section className="hero-section glass-panel">
          <div className="hero-text">
            <h2>UniCampus Lost & Found Architecture Verification</h2>
            <p>
              Phase 1 (Accounts & Auth) verified. The backend enforces <strong>Argon2id password hashing</strong>, 
              <strong> JWT Bearer tokens</strong>, and strict <strong>server-side role authorization</strong>.
            </p>
          </div>

          <div className="hero-action">
            <button
              id="btn-recheck-status"
              className="btn btn-primary"
              onClick={checkStatus}
              disabled={loading}
            >
              {loading ? 'Pinging Services...' : '🔄 Test Connectivity'}
            </button>
            {lastChecked && (
              <span className="last-checked">
                Last checked: {lastChecked} {latency ? `(${latency}ms)` : ''}
              </span>
            )}
          </div>
        </section>

        {/* Live Role-Based Authorization Proof Card (FR-AUTH-07, NFR-02) */}
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
              Single-page application running locally with hot module replacement and AuthContext.
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
              RESTful API with Pydantic validation, Argon2id password hashing, and PyJWT auth.
            </p>
            <div className="service-meta">
              <span>Port: <strong>8000</strong></span>
              <span>Auth: <code>/auth/login</code></span>
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
              Relational persistence with `users` table seeded with demo accounts.
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

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
