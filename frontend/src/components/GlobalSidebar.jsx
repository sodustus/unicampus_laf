import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  IconLogo,
  IconSearch,
  IconPlus,
  IconDashboard,
  IconReports,
  IconClaims,
  IconHandover,
  IconUser,
  IconAnalytics,
  IconUsers,
  IconScale,
  IconAudit,
  IconTrash,
  IconLogout,
  IconClose,
} from './Icons';

export default function GlobalSidebar({
  activePage,
  onNavigate,
  onOpenReportModal,
  claimsCount = 0,
  isOpen = false,
  onClose,
}) {
  const { user, isAdmin, logout } = useAuth();

  const handleNavClick = (page) => {
    onNavigate(page);
    if (onClose) onClose();
  };

  const handleCreateClick = () => {
    onOpenReportModal();
    if (onClose) onClose();
  };

  const userInitial = user?.full_name
    ? user.full_name[0].toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : 'U';

  return (
    <aside className={`global-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand-header">
        <div className="sidebar-brand-left">
          <div className="sidebar-brand-crest">
            <IconLogo size={26} />
          </div>
          <div className="sidebar-brand-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="sidebar-title">UniCampus LAF</span>
              <span className="badge badge-info" style={{ fontSize: '0.62rem', padding: '1px 6px', fontWeight: 700 }}>v2.0</span>
            </div>
            <div className="sidebar-subtitle">Lost & Found System</div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar menu"
            title="Close Menu"
          >
            <IconClose size={18} />
          </button>
        )}
      </div>

      {/* Primary Action Button */}
      <div className="sidebar-action-wrap">
        <button
          type="button"
          className="btn-sidebar-create"
          onClick={handleCreateClick}
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
                onClick={() => handleNavClick('feed')}
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
                onClick={() => handleNavClick('dashboard')}
              >
                <IconDashboard size={17} />
                <span>My Dashboard</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`nav-link-btn ${activePage === 'my-reports' ? 'active' : ''}`}
                onClick={() => handleNavClick('my-reports')}
              >
                <IconReports size={17} />
                <span>My Reports</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`nav-link-btn ${activePage === 'my-claims' ? 'active' : ''}`}
                onClick={() => handleNavClick('my-claims')}
              >
                <IconClaims size={17} />
                <span>My Claims</span>
                {claimsCount > 0 && (
                  <span className="nav-count-badge">{claimsCount}</span>
                )}
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`nav-link-btn ${activePage === 'handovers' ? 'active' : ''}`}
                onClick={() => handleNavClick('handovers')}
              >
                <IconHandover size={17} />
                <span>Handovers & Slips</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`nav-link-btn ${activePage === 'profile' ? 'active' : ''}`}
                onClick={() => handleNavClick('profile')}
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
                  onClick={() => handleNavClick('admin-analytics')}
                >
                  <IconAnalytics size={17} />
                  <span>System Analytics</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-link-btn ${activePage === 'admin-users' ? 'active' : ''}`}
                  onClick={() => handleNavClick('admin-users')}
                >
                  <IconUsers size={17} />
                  <span>User Directory</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-link-btn ${activePage === 'admin-claims' ? 'active' : ''}`}
                  onClick={() => handleNavClick('admin-claims')}
                >
                  <IconScale size={17} />
                  <span>Claims Verification</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-link-btn ${activePage === 'admin-audit' ? 'active' : ''}`}
                  onClick={() => handleNavClick('admin-audit')}
                >
                  <IconAudit size={17} />
                  <span>Compliance Audit</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`nav-link-btn ${activePage === 'admin-deleted' ? 'active' : ''}`}
                  onClick={() => handleNavClick('admin-deleted')}
                >
                  <IconTrash size={17} />
                  <span>Deleted Listings</span>
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
