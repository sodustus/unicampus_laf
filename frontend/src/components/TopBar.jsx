import React from 'react';
import { IconSearch, IconSun, IconMoon, IconMenu } from './Icons';
import { useTheme } from '../context/ThemeContext';

const PAGE_TITLES = {
  feed: 'Campus Listings Feed',
  dashboard: 'Student Dashboard',
  claims: 'Claims & Handover Center',
  profile: 'Student Profile & Settings',
  'admin-analytics': 'System Overview & Analytics',
  'admin-users': 'Campus User Directory',
  'admin-claims': 'Claims Review & Verification Desk',
  'admin-audit': 'Compliance Audit Trail',
};

export default function TopBar({
  activePage,
  searchQuery,
  onSearchChange,
  isBackendOnline,
  onToggleSidebar,
}) {
  const { isDark, toggleTheme } = useTheme();
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
        <div className="topbar-search-box">
          <IconSearch size={16} className="topbar-search-icon" />
          <input
            type="text"
            className="topbar-search-input"
            placeholder="Search listings, keywords, locations..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle dark/light theme"
        >
          {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
        </button>

        <div className={`topbar-status-badge ${isBackendOnline ? 'status-online' : 'status-warning'}`}>
          <span className={`status-pulse-dot ${isBackendOnline ? 'online' : 'warning'}`}></span>
          <span>{isBackendOnline ? 'System Online' : 'Connecting...'}</span>
        </div>
      </div>
    </header>
  );
}

