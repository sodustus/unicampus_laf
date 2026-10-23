import React from 'react';

export default function SearchFilters({
  filters,
  onFilterChange,
  categories,
  onOpenReportModal,
}) {
  return (
    <div className="glass-panel search-filters-panel">
      {/* Top Bar: Search Bar + Post Report CTA */}
      <div className="search-top-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            id="search-input"
            type="text"
            className="search-input"
            placeholder="Search items by name, description, or location (e.g. 'MacBook', 'Library', 'Keys')..."
            value={filters.q}
            onChange={(e) => onFilterChange('q', e.target.value)}
          />
          {filters.q && (
            <button
              className="search-clear-btn"
              onClick={() => onFilterChange('q', '')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <button
          id="btn-post-report"
          className="btn btn-primary"
          onClick={onOpenReportModal}
        >
          ➕ Report Lost / Found Item
        </button>
      </div>

      {/* Filter Row: Type Pills, Category Dropdown, Status, Sort */}
      <div className="filters-row">
        {/* Type Toggle Pills */}
        <div className="filter-group type-pills">
          <button
            className={`pill-btn ${!filters.type ? 'active' : ''}`}
            onClick={() => onFilterChange('type', '')}
          >
            All Reports
          </button>
          <button
            className={`pill-btn ${filters.type === 'lost' ? 'active lost' : ''}`}
            onClick={() => onFilterChange('type', 'lost')}
          >
            🔍 Lost
          </button>
          <button
            className={`pill-btn ${filters.type === 'found' ? 'active found' : ''}`}
            onClick={() => onFilterChange('type', 'found')}
          >
            📦 Found
          </button>
        </div>

        {/* Dropdowns */}
        <div className="filter-dropdowns">
          {/* Category Dropdown */}
          <div className="filter-select-wrap">
            <label htmlFor="filter-cat">Category:</label>
            <select
              id="filter-cat"
              className="filter-select"
              value={filters.category_id}
              onChange={(e) => onFilterChange('category_id', e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="filter-select-wrap">
            <label htmlFor="filter-status">Status:</label>
            <select
              id="filter-status"
              className="filter-select"
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
            >
              <option value="active">Active Only</option>
              <option value="recovered">Recovered</option>
              <option value="all">All Statuses</option>
            </select>
          </div>

          {/* Possession Status Filter (Issue #2) */}
          <div className="filter-select-wrap">
            <label htmlFor="filter-possession">Custody:</label>
            <select
              id="filter-possession"
              className="filter-select"
              value={filters.possession_status || ''}
              onChange={(e) => onFilterChange('possession_status', e.target.value)}
            >
              <option value="">All Custody</option>
              <option value="with_finder">🤝 With Finder</option>
              <option value="submitted_to_authority">🏛️ At Campus Office</option>
              <option value="returned">🎉 Returned</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="filter-select-wrap">
            <label htmlFor="filter-sort">Sort:</label>
            <select
              id="filter-sort"
              className="filter-select"
              value={filters.sort}
              onChange={(e) => onFilterChange('sort', e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
