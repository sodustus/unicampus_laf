import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ReportCard({ report, onSelect, onRecover, onDelete, onViewProfile }) {
  const { user, isAdmin } = useAuth();
  const isOwner = user && user.id === report.owner_id;
  const canManage = isOwner || isAdmin;

  const formattedDate = new Date(report.item_date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const getPossessionBadge = () => {
    if (!report.possession_status || report.possession_status === 'lost_unknown') return null;
    if (report.possession_status === 'returned') {
      return (
        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6EE7B7' }}>
          🎉 Returned
        </span>
      );
    }
    if (report.possession_status === 'submitted_to_authority') {
      return (
        <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#C084FC' }}>
          🏛️ At Campus Office
        </span>
      );
    }
    return (
      <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93C5FD' }}>
        🤝 With Finder
      </span>
    );
  };

  return (
    <div className={`glass-panel item-card ${report.type === 'lost' ? 'card-lost' : 'card-found'}`}>
      <div className="card-top-row">
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`badge ${report.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>
            {report.type === 'lost' ? '🔍 LOST' : '📦 FOUND'}
          </span>
          {getPossessionBadge()}
          {report.type === 'lost' && report.founder_id && report.status === 'active' && (
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6EE7B7' }}>
              ✓ Finder Linked
            </span>
          )}
        </div>
        <span
          className={`badge ${
            report.status === 'active'
              ? 'badge-info'
              : report.status === 'recovered'
              ? 'badge-success'
              : 'badge-warning'
          }`}
        >
          {report.status.toUpperCase()}
        </span>
      </div>

      <div className="card-content">
        <h4 className="item-title">{report.title}</h4>
        <span className="item-category">
          🏷️ {report.category?.name || 'General Item'}
        </span>
        <p className="item-description">{report.description}</p>
      </div>

      <div className="card-meta">
        <span title="Location">📍 {report.location}</span>
        <span title="Date">📅 {formattedDate}</span>
        {onViewProfile && (
          <button
            type="button"
            className="btn-link"
            style={{
              padding: '2px 6px',
              fontSize: '0.75rem',
              color: '#93C5FD',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(report.owner_id);
            }}
            title="View member profile"
          >
            {report.type === 'found' ? `📦 Finder: ID #${report.owner_id}` : `🔍 Lost by: ID #${report.owner_id}`}
          </button>
        )}
      </div>

      <div className="card-footer">
        <button className="btn btn-secondary btn-sm" onClick={() => onSelect(report)}>
          View Details &rarr;
        </button>

        {canManage && report.status === 'active' && (
          <div className="owner-quick-actions">
            {report.type === 'lost' && (
              <button
                className="btn btn-recover btn-sm"
                title="Mark this item as recovered"
                onClick={() => onRecover(report.id)}
              >
                ✅ Recovered
              </button>
            )}
            <button
              className="btn btn-delete btn-sm"
              title="Delete report"
              onClick={() => onDelete(report.id)}
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
