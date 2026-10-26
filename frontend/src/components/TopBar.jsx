import React from 'react';
import { IconMenu } from './Icons';
import { useTheme } from '../context/ThemeContext';

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
  const { isDark, toggleTheme } = useTheme();
  const title = PAGE_TITLES[activePage] || 'Campus Portal';

  return (
    <header className="global-topbar">
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
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title="Toggle Dark/Light Swiss"
        >
          {isDark ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
          <span>{isDark ? 'Dark Swiss' : 'Light Swiss'}</span>
        </button>

        <div className={`topbar-status-badge ${isBackendOnline ? 'status-online' : 'status-warning'}`}>
          <span className={`status-pulse-dot ${isBackendOnline ? 'online' : 'warning'}`}></span>
          <span>{isBackendOnline ? 'System Online' : 'Connecting...'}</span>
        </div>
      </div>
    </header>
  );
}
