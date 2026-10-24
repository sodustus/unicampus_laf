import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../api/client';
import { IconCheck, IconAlert } from '../components/Icons';

export default function ProfilePage() {
  const { user, setUser, token, isAdmin } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhoneNumber(user.phone_number || '');
      setDepartment(user.department || '');
    }
  }, [user]);

  const handlePhoneChange = (val) => {
    let cleaned = val.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
      if (cleaned.length > 13) cleaned = cleaned.slice(0, 13);
    } else {
      cleaned = cleaned.replace(/\+/g, '');
      if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
    }
    setPhoneNumber(cleaned);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    if (phoneNumber.trim()) {
      const digits = phoneNumber.replace(/\+/g, '');
      if (digits.length < 7 || digits.length > 15) {
        setError('Phone number must contain between 7 and 15 digits.');
        setSaving(false);
        return;
      }
    }

    try {
      const updated = await updateUserProfile(
        {
          full_name: fullName.trim() || undefined,
          phone_number: phoneNumber.trim() || null,
          department: department.trim() || undefined,
        },
        token
      );
      setUser(updated);
      setSuccessMsg('Profile settings updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page-container">
      {/* Header Card */}
      <div className="glass-panel profile-header-card">
        <div>
          <h2 className="profile-heading">Account Profile & Preferences</h2>
          <p className="profile-subheading">
            Manage your verified campus contact details, department affiliation, and privacy preferences.
          </p>
        </div>
      </div>

      <div className="profile-grid" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Left Column: Summary Card */}
        <div className="glass-panel profile-summary-card" style={{ padding: '24px', textAlign: 'center' }}>
          <div className="profile-large-avatar" style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 800,
            margin: '0 auto 16px auto',
          }}>
            {user?.full_name ? user.full_name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'U'}
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{user?.full_name || 'Campus Student'}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>{user?.email}</p>

          <div style={{ marginTop: '12px' }}>
            <span className={`badge ${isAdmin ? 'badge-role-admin' : 'badge-role-user'}`}>
              {isAdmin ? 'Campus Administrator' : 'Verified Student'}
            </span>
          </div>

          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', textAlign: 'left', fontSize: '0.85rem' }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Department:</span>{' '}
              <strong>{user?.department || 'Not Assigned'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>{' '}
              <strong style={{ color: '#34d399' }}>Active & Verified</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="glass-panel profile-form-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '4px' }}>Edit Contact Details</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Phone numbers are strictly protected and only disclosed to verified parties upon mutual handover approval.
          </p>

          {successMsg && (
            <div className="alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconCheck size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="alert-error" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Campus Email (Read-Only)</label>
              <input
                type="email"
                className="form-input"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.65, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label>Academic Department</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Computer Science & IT / Civil Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Phone Number (Protected for Handover Handshake)</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. 0911223344 or +251911223344"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: '10px' }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
