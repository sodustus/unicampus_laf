import React from 'react';
import { IconSearch } from './Icons';

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
}) {
  const title = PAGE_TITLES[activePage] || 'Campus Portal';

  return (
    <header className="global-topbar glass-panel">
      <div className="topbar-title-section">
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

        <div className={`topbar-status-badge ${isBackendOnline ? 'status-online' : 'status-warning'}`}>
          <span className={`status-pulse-dot ${isBackendOnline ? 'online' : 'warning'}`}></span>
          <span>{isBackendOnline ? 'System Online' : 'Connecting...'}</span>
        </div>
      </div>
    </header>
  );
}
