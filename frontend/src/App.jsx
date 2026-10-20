import React, { useState, useEffect } from 'react';
import { fetchHealth } from './api/client';
import './App.css';

export default function App() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [latency, setLatency] = useState(null);

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

  const isBackendOnline = healthData?.success && healthData?.data?.status === 'online';
  const isDbConnected = healthData?.data?.database?.status === 'connected';

  const roadmapSteps = [
    { num: 1, title: 'Skeleton', desc: 'React app, FastAPI app, and PostgreSQL connected', status: 'current' },
    { num: 2, title: 'Accounts & Auth', desc: 'Register, login, logout with user and admin roles', status: 'upcoming' },
    { num: 3, title: 'Report CRUD', desc: 'Lost and found item reporting (shared table with type field)', status: 'upcoming' },
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
          <span className="badge badge-info">SRS Phase 0</span>
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
            <h2>Phase 0: Project Skeleton Verification</h2>
            <p>
              Verifying 3-tier connectivity between the <strong>React + Vite</strong> frontend, 
              <strong> FastAPI</strong> backend, and <strong>PostgreSQL</strong> database.
            </p>
          </div>

          <div className="hero-action">
            <button
              id="btn-recheck-status"
              className="btn btn-primary"
              onClick={checkStatus}
              disabled={loading}
            >
              {loading ? 'Pinging Services...' : '🔄 Test Connection'}
            </button>
            {lastChecked && (
              <span className="last-checked">
                Last checked: {lastChecked} {latency ? `(${latency}ms)` : ''}
              </span>
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
              Single-page application running locally with hot module replacement.
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
              RESTful API with Pydantic request validation and CORS middleware.
            </p>
            <div className="service-meta">
              <span>Port: <strong>8000</strong></span>
              <span>Endpoint: <code>/health</code></span>
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
              Relational persistence managed via SQLAlchemy ORM with connection pooling.
            </p>
            <div className="service-meta">
              <span>Port: <strong>5432</strong></span>
              <span>DB: <strong>unicampus_laf</strong></span>
            </div>
          </div>
        </section>

        {/* Live API Response Inspector */}
        <section className="glass-panel api-inspector">
          <div className="inspector-header">
            <h3>Live Health Probe Response (GET /health)</h3>
            <span className="badge badge-info">{latency ? `${latency} ms response` : 'Idle'}</span>
          </div>
          <pre className="code-view">
            {loading
              ? '// Pinging backend server at http://127.0.0.1:8000/health ...'
              : JSON.stringify(healthData?.data || healthData, null, 2)}
          </pre>
          {!isDbConnected && (
            <div className="setup-hint">
              <strong>Database Notice:</strong> If PostgreSQL isn't running yet on port 5432, run in Admin PowerShell:
              <code>Start-Service postgresql-x64-18</code> and create DB:
              <code>&amp; "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres -p 5432 unicampus_laf</code>
            </div>
          )}
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
                className={`roadmap-item ${step.status === 'current' ? 'is-current' : ''}`}
              >
                <div className="step-badge">{step.num}</div>
                <div className="step-info">
                  <div className="step-header">
                    <h4>{step.title}</h4>
                    {step.status === 'current' && (
                      <span className="badge badge-info">In Progress</span>
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
    </div>
  );
}
