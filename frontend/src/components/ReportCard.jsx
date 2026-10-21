import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ReportCard({ report, onSelect, onRecover, onDelete }) {
  const { user, isAdmin } = useAuth();
  const isOwner = user && user.id === report.owner_id;
  const canManage = isOwner || isAdmin;

  const formattedDate = new Date(report.item_date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className={`glass-panel item-card ${report.type === 'lost' ? 'card-lost' : 'card-found'}`}>
      <div className="card-top-row">
        <span className={`badge ${report.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>
          {report.type === 'lost' ? '🔍 LOST' : '📦 FOUND'}
        </span>
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
