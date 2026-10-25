import React from 'react';
import { useAuth } from '../context/AuthContext';
import { IconMapPin, IconClock, IconTag, IconCheck } from './Icons';

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
        <span className="badge badge-success">
          Returned
        </span>
      );
    }
    if (report.possession_status === 'submitted_to_authority') {
      return (
        <span className="badge badge-info">
          At Campus Office
        </span>
      );
    }
    return (
      <span className="badge badge-warning">
        With Finder
      </span>
    );
  };

  return (
    <div className={`glass-panel item-card ${report.type === 'lost' ? 'card-lost' : 'card-found'}`}>
      <div className="card-top-row">
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`badge ${report.type === 'lost' ? 'badge-danger' : 'badge-success'}`}>
            {report.type === 'lost' ? 'LOST' : 'FOUND'}
          </span>
          {getPossessionBadge()}
          {report.type === 'lost' && report.founder_id && report.status === 'active' && (
            <span
              className={`badge ${report.claim_status === 'approved' ? 'badge-success' : 'badge-warning'}`}
              style={{ fontSize: '0.7rem' }}
            >
              {report.claim_status === 'approved' ? 'Handover Approved' : 'Verification Review'}
            </span>
          )}
        </div>
        <span
          className={`badge ${
            report.status === 'deleted'
              ? 'badge-danger'
              : report.status === 'active'
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
        <div className="item-category-row">
          <IconTag size={13} className="item-category-icon" />
          <span className="item-category">{report.category?.name || 'General Item'}</span>
        </div>
        {report.status === 'deleted' && report.deletion_reason && (
          <p style={{ margin: '4px 0', fontSize: '0.78rem', color: 'var(--accent-lost)' }}>
            <em>Reason: {report.deletion_reason}</em>
          </p>
        )}
        <p className="item-description">{report.description}</p>
      </div>

      <div className="card-meta">
        <span className="meta-item" title="Location">
          <IconMapPin size={13} />
          <span>{report.location}</span>
        </span>
        <span className="meta-item" title="Date">
          <IconClock size={13} />
          <span>{formattedDate}</span>
        </span>
        {onViewProfile && report.owner_id && (
          <button
            type="button"
            className="btn-member-tag"
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(report.owner_id);
            }}
            title={`View profile for ${report.owner?.full_name || report.owner?.email || `User #${report.owner_id}`}`}
          >
            {report.type === 'found'
              ? (isOwner ? 'Finder: You' : `Finder: ${report.owner?.full_name || report.owner?.email || `User #${report.owner_id}`}`)
              : (isOwner ? 'Owner: You' : `Owner: ${report.owner?.full_name || report.owner?.email || `User #${report.owner_id}`}`)}
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
                <IconCheck size={13} />
                <span>Recovered</span>
              </button>
            )}
            <button
              className="btn btn-delete btn-sm"
              title="Delete report"
              onClick={() => onDelete(report.id)}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
