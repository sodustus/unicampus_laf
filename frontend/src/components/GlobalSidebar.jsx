import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  IconLogo,
  IconSearch,
  IconPlus,
  IconDashboard,
  IconClaims,
  IconUser,
  IconAnalytics,
  IconUsers,
  IconScale,
  IconAudit,
  IconLogout,
} from './Icons';

export default function GlobalSidebar({
  activePage,
  onNavigate,
  onOpenReportModal,
  claimsCount = 0,
}) {
  const { user, isAdmin, logout } = useAuth();

  const userInitial = user?.full_name
    ? user.full_name[0].toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : 'U';

  return (
    <aside className="global-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand-header">
        <div className="sidebar-brand-crest">
          <IconLogo size={26} />
        </div>
        <div className="sidebar-brand-meta">
          <div className="sidebar-title">UniCampus LAF</div>
          <div className="sidebar-subtitle">Lost & Found System</div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="sidebar-action-wrap">
        <button
          type="button"
          className="btn-sidebar-create"
          onClick={onOpenReportModal}
          title="Create a new lost or found report"
        >
          <IconPlus size={16} />
          <span>Post a Report</span>
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav-container">
        {/* Campus Group */}
        <div className="nav-group">
          <div className="nav-group-title">Campus</div>
          <ul className="nav-items-list">
            <li>
              <button
                type="button"
                className={`nav-link-btn ${activePage === 'feed' ? 'active' : ''}`}
                onClick={() => onNavigate('feed')}
              >
                <IconSearch size={17} />
                <span>Browse Listings</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Student Activity Group */}
        <div className="nav-group">
          <div className="nav-group-title">My Activity</div>
          <ul className="nav-items-list">
            <li>
              <button
                type="button"
                className={`nav-link-btn ${activePage === 'dashboard' ? 'active' : ''}`}
                onClick={() => onNavigate('dashboard')}
              >
                <IconDashboard size={17} />
                <span>My Dashboard</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`nav-link-btn ${activePage === 'claims' ? 'active' : ''}`}
                onClick={() => onNavigate('claims')}
              >
                <IconClaims size={17} />
                <span>My Claims & Slips</span>
                {claimsCount > 0 && (
                  <span className="nav-count-badge">{claimsCount}</span>
                )}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`nav-link-btn ${activePage === 'profile' ? 'active' : ''}`}
                onClick={() => onNavigate('profile')}
              >
                <IconUser size={17} />
                <span>Profile & Settings</span>
              </button>
            </li>
          </ul>
        </div>

        {/* Administration Group (Admin Only) */}
        {isAdmin && (
          <div className="nav-group admin-nav-group">
            <div className="nav-group-title admin-title">Administration</div>
            <ul className="nav-items-list">
              <li>
                <button
                  type="button"
                  className={`nav-link-btn ${activePage === 'admin-analytics' ? 'active' : ''}`}
                  onClick={() => onNavigate('admin-analytics')}
                >
                  <IconAnalytics size={17} />
                  <span>System Analytics</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-link-btn ${activePage === 'admin-users' ? 'active' : ''}`}
                  onClick={() => onNavigate('admin-users')}
                >
                  <IconUsers size={17} />
                  <span>User Directory</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-link-btn ${activePage === 'admin-claims' ? 'active' : ''}`}
                  onClick={() => onNavigate('admin-claims')}
                >
                  <IconScale size={17} />
                  <span>Claims Verification</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-link-btn ${activePage === 'admin-audit' ? 'active' : ''}`}
                  onClick={() => onNavigate('admin-audit')}
                >
                  <IconAudit size={17} />
                  <span>Compliance Audit</span>
                </button>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* User Footer Profile */}
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="sidebar-avatar">{userInitial}</div>
          <div className="sidebar-user-details">
            <div className="sidebar-user-name">
              {user?.full_name || user?.email || 'User'}
            </div>
            <span className={`sidebar-role-pill ${isAdmin ? 'role-admin' : 'role-student'}`}>
              {isAdmin ? 'Administrator' : 'Student'}
            </span>
          </div>
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={logout}
            title="Sign Out"
          >
            <IconLogout size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
