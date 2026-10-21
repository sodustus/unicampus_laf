import React, { useState, useEffect } from 'react';
import { fetchCategories, createReport } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ReportModal({ isOpen, onClose, onReportCreated }) {
  const { token, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState([]);
  const [type, setType] = useState('lost');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [location, setLocation] = useState('');
  const [itemDate, setItemDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [identifyingDetails, setIdentifyingDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
        .then((cats) => {
          setCategories(cats);
          if (cats.length > 0 && !categoryId) {
            setCategoryId(cats[0].id);
          }
        })
        .catch((err) => console.error('Failed to load categories:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated) {
      setError('You must be signed in to submit a report.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type,
        title: title.trim(),
        description: description.trim(),
        category_id: parseInt(categoryId, 10),
        location: location.trim(),
        item_date: new Date(itemDate).toISOString(),
        identifying_details: identifyingDetails.trim() || null,
      };

      const newReport = await createReport(payload, token);
      onReportCreated(newReport);
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setLocation('');
      setIdentifyingDetails('');
    } catch (err) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog glass-panel" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">{type === 'lost' ? '🔍' : '📦'}</span>
            <div>
              <h3>{type === 'lost' ? 'Report a Lost Item' : 'Register a Found Item'}</h3>
              <p className="modal-subtitle">
                Fill in the details to help connect this item with its rightful owner
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Type Toggle */}
        <div className="tab-switcher">
          <button
            type="button"
            className={`tab-btn ${type === 'lost' ? 'active' : ''}`}
            onClick={() => setType('lost')}
            style={type === 'lost' ? { background: 'rgba(239, 68, 68, 0.25)', color: '#FCA5A5' } : {}}
          >
            🔍 I Lost Something
          </button>
          <button
            type="button"
            className={`tab-btn ${type === 'found' ? 'active' : ''}`}
            onClick={() => setType('found')}
            style={type === 'found' ? { background: 'rgba(16, 185, 129, 0.25)', color: '#6EE7B7' } : {}}
          >
            📦 I Found Something
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="report-title">Item Title / Name *</label>
            <input
              id="report-title"
              type="text"
              placeholder="e.g. Silver MacBook Pro 14 or Blue Keychain"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="report-category">Category *</label>
              <select
                id="report-category"
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="report-date">
                {type === 'lost' ? 'Date Lost *' : 'Date Found *'}
              </label>
              <input
                id="report-date"
                type="date"
                value={itemDate}
                onChange={(e) => setItemDate(e.target.value)}
                required
              >
              </input>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="report-location">
              {type === 'lost' ? 'Approximate Location Lost *' : 'Location Found *'}
            </label>
            <input
              id="report-location"
              type="text"
              placeholder="e.g. Main Library 2nd Floor, cafeteria, or Bus Stop"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="report-desc">Public Description *</label>
            <textarea
              id="report-desc"
              className="form-textarea"
              rows={3}
              placeholder="Describe color, general brand, circumstances..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={5}
            />
          </div>

          {/* FR-SEARCH-06: Sensitive identifying details */}
          <div className="form-group proof-field-group">
            <div className="proof-label-wrap">
              <label htmlFor="report-proof">
                🔒 Private Identifying Proof (Optional)
              </label>
              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>RESTRICTED</span>
            </div>
            <textarea
              id="report-proof"
              className="form-textarea"
              rows={2}
              placeholder="Private details known only to the true owner (e.g. serial numbers, specific scratches, wallpaper image, or custom engraving). Stays hidden from public listings."
              value={identifyingDetails}
              onChange={(e) => setIdentifyingDetails(e.target.value)}
            />
            <span className="proof-note">
              🛡️ <strong>Privacy Protection (FR-SEARCH-06):</strong> This field will <em>never</em> appear on public listings or to other users. Only you and administrators can view it.
            </span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting Report...' : `Submit ${type === 'lost' ? 'Lost' : 'Found'} Report`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
