import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, fetchUserProfile } from '../api/client';

export default function ProfileModal({ isOpen, onClose, targetUserId = null, isSelfEdit = false }) {
  const { user, setUser, token, isAdmin } = useAuth();
  
  // View mode state
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Edit mode state
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const isEditing = isSelfEdit || (user && targetUserId && user.id === targetUserId);

  useEffect(() => {
    if (!isOpen) {
      setProfileData(null);
      setError('');
      setSuccessMsg('');
      return;
    }

    if (isEditing) {
      setFullName(user?.full_name || '');
      setPhoneNumber(user?.phone_number || '');
      setDepartment(user?.department || '');
    } else if (targetUserId) {
      setLoading(true);
      setError('');
      fetchUserProfile(targetUserId, token)
        .then((data) => {
          setProfileData(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load profile');
          setLoading(false);
        });
    }
  }, [isOpen, targetUserId, isEditing, user, token]);

  if (!isOpen) return null;

  const handlePhoneChange = (val) => {
    let cleaned = val.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
      if (cleaned.length > 13) {
        cleaned = cleaned.slice(0, 13);
      }
    } else {
      cleaned = cleaned.replace(/\+/g, '');
      if (cleaned.length > 10) {
        cleaned = cleaned.slice(0, 10);
      }
    }
    setPhoneNumber(cleaned);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    if (phoneNumber.trim()) {
      if (phoneNumber.startsWith('+')) {
        if (phoneNumber.length > 13 || phoneNumber.length < 8) {
          setError('International phone number (+ format) must be between 8 and 13 characters (e.g. +251983072052).');
          setSaving(false);
          return;
        }
      } else {
        if (phoneNumber.length > 10 || phoneNumber.length < 7) {
          setError('Local phone number must be at most 10 digits (e.g. 0983072052).');
          setSaving(false);
          return;
        }
      }
    }

    try {
      const updated = await updateUserProfile(
        {
          full_name: fullName.trim() || null,
          phone_number: phoneNumber.trim() || null,
          department: department.trim() || null,
        },
        token
      );
      if (setUser) {
        setUser((prev) => ({ ...prev, ...updated }));
      }
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog glass-panel" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">{isEditing ? '👤' : '🎓'}</span>
            <div>
              <h3>{isEditing ? 'My Campus Profile' : 'Student & Member Profile'}</h3>
              <p className="modal-subtitle">
                {isEditing
                  ? 'Manage your contact details and campus department'
                  : 'Verified campus member information and handover contact'}
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert-error" style={{ margin: '12px 0' }}>{error}</div>}
        {successMsg && <div className="alert-success" style={{ margin: '12px 0' }}>{successMsg}</div>}

        {/* Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSave} className="auth-form">
            <div className="form-group">
              <label>Campus Email (Account Login)</label>
              <input
                type="text"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="prof-name">Full Name</label>
              <input
                id="prof-name"
                type="text"
                placeholder="e.g. Abebe Bikila"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label htmlFor="prof-phone">Contact Phone Number</label>
              <input
                id="prof-phone"
                type="tel"
                placeholder="e.g. +251983072052 or 0983072052"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                maxLength={phoneNumber.startsWith('+') ? 13 : 10}
              />
              <span className="field-hint" style={{ display: 'block', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Numbers only. Limits: 10 digits for 09... or 13 chars for +251...
              </span>
              <span className="proof-note" style={{ display: 'block', marginTop: '4px' }}>
                🔒 <strong>Privacy Protection:</strong> Your phone number is masked from public listings and only disclosed to claimants/founders once an ownership claim is officially approved by administration.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="prof-dept">Department / Faculty</label>
              <input
                id="prof-dept"
                type="text"
                placeholder="e.g. Computer Science, Mechanical Eng., Law"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving Changes...' : 'Save Profile'}
              </button>
            </div>
          </form>
        ) : loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading member profile...
          </div>
        ) : profileData ? (
          <div className="profile-view-body" style={{ padding: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3B82F6, #10B981)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                }}
              >
                {(profileData.full_name || profileData.email)[0].toUpperCase()}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#F1F5F9' }}>
                  {profileData.full_name || 'Campus Student'}
                </h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span className={`badge ${profileData.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                    {profileData.role.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Member #{profileData.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-meta-grid" style={{ marginBottom: '20px' }}>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Department</span>
                <span className="detail-meta-value">
                  🏛️ {profileData.department || 'Not specified'}
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Reports Posted</span>
                <span className="detail-meta-value">
                  📦 {profileData.reports_count} items
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Email</span>
                <span className="detail-meta-value">
                  ✉️ {profileData.email}
                </span>
              </div>
              <div className="detail-meta-item">
                <span className="detail-meta-label">Member Since</span>
                <span className="detail-meta-value">
                  📅 {new Date(profileData.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Handover Contact Box */}
            <div
              style={{
                background: profileData.phone_number
                  ? 'rgba(16, 185, 129, 0.1)'
                  : 'rgba(51, 65, 85, 0.4)',
                border: profileData.phone_number
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : '1px solid rgba(100, 116, 139, 0.2)',
                borderRadius: '10px',
                padding: '14px 18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#E2E8F0' }}>
                  📞 Handover Contact Phone
                </span>
                {profileData.phone_number ? (
                  <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                    REVEALED (CLAIM AUTHORIZED)
                  </span>
                ) : (
                  <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                    MASKED
                  </span>
                )}
              </div>

              {profileData.phone_number ? (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 600, color: '#6EE7B7' }}>
                    {profileData.phone_number}
                  </span>
                  <a
                    href={`tel:${profileData.phone_number}`}
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: 'none', padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    Call Now
                  </a>
                </div>
              ) : (
                <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  🔒 Phone number is protected by campus privacy policy. It will be revealed automatically once an administrator approves your ownership claim for this member's item.
                </p>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
