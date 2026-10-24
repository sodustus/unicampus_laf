import React, { useState, useEffect } from 'react';
import { fetchCategories, createReport, fetchReports } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ReportModal({ isOpen, onClose, onReportCreated, onInspectMatchingReport, initialData = null }) {
  const { token, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState([]);
  const [type, setType] = useState('lost');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [location, setLocation] = useState('');
  const [itemDate, setItemDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [identifyingDetails, setIdentifyingDetails] = useState('');
  const [possessionStatus, setPossessionStatus] = useState('with_finder');
  const [custodyLocation, setCustodyLocation] = useState('');
  const [custodianPhone, setCustodianPhone] = useState('');

  const handleCustodianPhoneChange = (val) => {
    let sanitized = val.replace(/[^0-9+]/g, '');
    if (sanitized.indexOf('+') > 0) {
      sanitized = sanitized.charAt(0) + sanitized.slice(1).replace(/\+/g, '');
    }
    const maxLen = sanitized.startsWith('+') ? 13 : 10;
    setCustodianPhone(sanitized.slice(0, maxLen));
  };
  
  // Issue #7: Pre-submission Category Match Check state
  const [matchingCandidates, setMatchingCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [matchConfirmed, setMatchConfirmed] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        if (initialData.type) setType(initialData.type);
        if (initialData.title) setTitle(initialData.title);
        if (initialData.description) setDescription(initialData.description);
        if (initialData.categoryId) setCategoryId(initialData.categoryId);
        if (initialData.location) setLocation(initialData.location);
        if (initialData.possessionStatus) setPossessionStatus(initialData.possessionStatus);
        if (initialData.custodyLocation) setCustodyLocation(initialData.custodyLocation);
      }
      fetchCategories()
        .then((cats) => {
          setCategories(cats);
          if (cats.length > 0 && !initialData?.categoryId) {
            setCategoryId((prev) => prev || cats[0].id);
          }
        })
        .catch((err) => console.error('Failed to load categories:', err));
    }
  }, [isOpen, initialData]);

  // Issue #7: Fetch matching opposite-type reports when category or type changes
  useEffect(() => {
    if (!isOpen || !categoryId) {
      setMatchingCandidates([]);
      setMatchConfirmed(true);
      return;
    }

    const targetType = type === 'found' ? 'lost' : 'found';
    setLoadingCandidates(true);
    fetchReports({
      type: targetType,
      category_id: categoryId,
      status: 'active',
    })
      .then((items) => {
        const candidates = items || [];
        setMatchingCandidates(candidates);
        if (candidates.length > 0) {
          setMatchConfirmed(false);
        } else {
          setMatchConfirmed(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load matching candidates:', err);
        setMatchingCandidates([]);
        setMatchConfirmed(true);
      })
      .finally(() => {
        setLoadingCandidates(false);
      });
  }, [isOpen, categoryId, type]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated) {
      setError('You must be signed in to submit a report.');
      return;
    }

    if (type === 'found' && possessionStatus === 'submitted_to_authority' && !custodyLocation.trim()) {
      setError('Please specify the campus office or custody location where the item was submitted.');
      return;
    }

    if (matchingCandidates.length > 0 && !matchConfirmed) {
      setError(`Please review the existing ${type === 'found' ? 'lost' : 'found'} items in this category and click 'Confirm No Match' before submitting.`);
      return;
    }

    setSubmitting(true);
    try {
      let finalCustodyLocation = null;
      if (type === 'found' && possessionStatus === 'submitted_to_authority') {
        finalCustodyLocation = custodianPhone.trim()
          ? `${custodyLocation.trim()} (Office Tel: ${custodianPhone.trim()})`
          : custodyLocation.trim();
      }

      const payload = {
        type,
        title: title.trim(),
        description: description.trim(),
        category_id: parseInt(categoryId, 10),
        location: location.trim(),
        item_date: new Date(itemDate).toISOString(),
        identifying_details: identifyingDetails.trim() || null,
        possession_status: type === 'found' ? possessionStatus : 'lost_unknown',
        custody_location: finalCustodyLocation,
      };

      const newReport = await createReport(payload, token);
      onReportCreated(newReport);
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setLocation('');
      setIdentifyingDetails('');
      setCustodyLocation('');
      setCustodianPhone('');
      setPossessionStatus('with_finder');
    } catch (err) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
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
              />
            </div>
          </div>

          {/* Issue #7: Pre-submission Category Match Check */}
          {loadingCandidates ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '6px 0', padding: '6px 10px' }}>
              Checking existing {type === 'found' ? 'lost' : 'found'} items in this category...
            </div>
          ) : matchingCandidates.length > 0 ? (
            <div
              className="match-check-box"
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '8px',
                padding: '12px 14px',
                margin: '10px 0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FCD34D' }}>
                  ⚠️ Check Existing {type === 'found' ? 'Lost' : 'Found'} Items ({matchingCandidates.length} in this Category)
                </span>
                <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                  PRE-CHECK
                </span>
              </div>
              <p style={{ margin: '4px 0 8px 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {type === 'found'
                  ? 'Could the item you found belong to one of these students who reported losing it?'
                  : 'Has someone already found and registered your lost item below?'}
              </p>

              <div
                style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {matchingCandidates.map((cand) => (
                    <li
                      key={cand.id}
                      style={{
                        padding: '8px 0',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ color: '#F1F5F9', fontSize: '0.85rem' }}>{cand.title}</strong>
                          <span style={{ fontSize: '0.75rem', color: '#93C5FD' }}>📍 {cand.location}</span>
                        </div>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cand.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.7rem', padding: '3px 8px', whiteSpace: 'nowrap' }}
                        onClick={() => {
                          if (onInspectMatchingReport) {
                            onInspectMatchingReport(cand.id);
                          }
                        }}
                      >
                        {type === 'lost' ? '🤝 Inspect & Claim' : '🔍 Inspect Item'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: matchConfirmed ? '#6EE7B7' : '#FCA5A5', fontWeight: 500 }}>
                  {matchConfirmed
                    ? '✓ Confirmed: None of these match my item'
                    : '⚠️ Please confirm that none of these match before posting'}
                </span>
                <button
                  type="button"
                  className={`btn btn-sm ${matchConfirmed ? 'btn-success' : 'btn-warning'}`}
                  style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                  onClick={() => setMatchConfirmed(!matchConfirmed)}
                >
                  {matchConfirmed ? '✓ Match Checked' : 'Confirm No Match'}
                </button>
              </div>
            </div>
          ) : null}

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

          {/* Issue #2: Physical Possession / Handover System for Found items */}
          {type === 'found' && (
            <div
              className="form-group"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#E2E8F0' }}>
                📍 Physical Possession & Handover Custody *
              </label>
              <p style={{ margin: '4px 0 10px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Clarify who currently holds the item so claimants know where handover will take place.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: possessionStatus === 'with_finder' ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                    border: possessionStatus === 'with_finder' ? '2px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: 500,
                  }}
                >
                  <input
                    type="radio"
                    name="possession_status"
                    value="with_finder"
                    checked={possessionStatus === 'with_finder'}
                    onChange={() => setPossessionStatus('with_finder')}
                  />
                  <span>🤝 In My Custody</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: possessionStatus === 'submitted_to_authority' ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                    border: possessionStatus === 'submitted_to_authority' ? '2px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: 500,
                  }}
                >
                  <input
                    type="radio"
                    name="possession_status"
                    value="submitted_to_authority"
                    checked={possessionStatus === 'submitted_to_authority'}
                    onChange={() => setPossessionStatus('submitted_to_authority')}
                  />
                  <span>🏛️ Deposited at Office</span>
                </label>
              </div>

              {possessionStatus === 'submitted_to_authority' && (
                <div style={{ marginTop: '12px' }}>
                  <label htmlFor="custody-location" style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>
                    Specific Office / Authority Location *
                  </label>
                  <input
                    id="custody-location"
                    type="text"
                    placeholder="e.g. Main Library Front Desk, Guard Post #2, Dean Office Room 104"
                    value={custodyLocation}
                    onChange={(e) => setCustodyLocation(e.target.value)}
                    required
                    style={{ marginTop: '4px' }}
                  />

                  {/* Optional Custodian Phone Number */}
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ fontWeight: 500, fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem', color: '#CBD5E1' }}>
                      📞 Custodian / Office Phone Number <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Optional, numbers only)</span>
                    </label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. +251111234567 or 0111234567"
                      value={custodianPhone}
                      onChange={(e) => handleCustodianPhoneChange(e.target.value)}
                      maxLength={custodianPhone.startsWith('+') ? 13 : 10}
                    />
                    <span className="field-hint" style={{ display: 'block', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Helpful for direct calls. Limits: 10 digits for local (01.../09...) or 13 chars for (+251...).
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || (matchingCandidates.length > 0 && !matchConfirmed)}
            >
              {submitting
                ? 'Submitting Report...'
                : matchingCandidates.length > 0 && !matchConfirmed
                ? '⚠️ Confirm No Match to Submit'
                : `Submit ${type === 'lost' ? 'Lost' : 'Found'} Report`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
