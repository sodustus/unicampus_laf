import React from 'react';
import SearchFilters from '../components/SearchFilters';
import ReportCard from '../components/ReportCard';
import { IconPlus } from '../components/Icons';

export default function CampusFeedPage({
  reports,
  loadingReports,
  categories,
  filters,
  onFilterChange,
  onSelectReport,
  onRecoverReport,
  onDeleteReport,
  onViewProfile,
  onOpenReportModal,
}) {
  return (
    <div className="campus-feed-page">
      {/* Header Row */}
      <div className="feed-header-row">
        <div className="feed-header-left">
          <h3 className="feed-section-heading">Campus Listings</h3>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <SearchFilters
        filters={filters}
        onFilterChange={onFilterChange}
        categories={categories}
        onOpenReportModal={onOpenReportModal}
        itemsCount={reports.length}
      />

      {/* Grid Content */}
      {loadingReports ? (
        <div className="glass-panel feed-loading-box">
          <p>Loading campus listings...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-panel feed-empty-box">
          <h4 className="empty-title">No reports match your filters</h4>
          <p className="empty-subtitle">
            Try clearing your search query, switching categories, or be the first to publish a report.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenReportModal}
          >
            <IconPlus size={16} />
            <span>Post a Report Now</span>
          </button>
        </div>
      ) : (
        <div className="reports-grid">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onSelect={onSelectReport}
              onRecover={onRecoverReport}
              onDelete={onDeleteReport}
              onViewProfile={onViewProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
