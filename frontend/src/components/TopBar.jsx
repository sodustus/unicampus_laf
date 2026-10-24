import React from 'react';
import { IconMenu } from './Icons';

const PAGE_TITLES = {
  feed: 'Campus Listings Feed',
  dashboard: 'Student Dashboard',
  'my-reports': 'My Campus Listings',
  'my-claims': 'My Ownership Claims',
  handovers: 'Official Handover Slips & Coordination',
  claims: 'My Claims Tracker',
  profile: 'Student Profile & Settings',
  'admin-analytics': 'System Overview & Analytics',
  'admin-users': 'Campus User Directory',
  'admin-claims': 'Claims Review & Verification Desk',
  'admin-audit': 'Compliance Audit Trail',
  'admin-deleted': 'Soft-Deleted & Duplicate Listings',
};

export default function TopBar({
  activePage,
  isBackendOnline,
  onToggleSidebar,
}) {
  const title = PAGE_TITLES[activePage] || 'Campus Portal';

  return (
    <header className="global-topbar glass-panel">
      <div className="topbar-title-section">
        <button
          type="button"
          className="topbar-mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          title="Toggle Navigation Menu"
        >
          <IconMenu size={20} />
        </button>
        <h2 className="topbar-page-title">{title}</h2>
      </div>

      <div className="topbar-actions-section">
        <div className={`topbar-status-badge ${isBackendOnline ? 'status-online' : 'status-warning'}`}>
          <span className={`status-pulse-dot ${isBackendOnline ? 'online' : 'warning'}`}></span>
          <span>{isBackendOnline ? 'System Online' : 'Connecting...'}</span>
        </div>
      </div>
    </header>
  );
}
