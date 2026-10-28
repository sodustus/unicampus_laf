import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  IconLogo,
  IconAlert,
  IconShield,
  IconClock,
  IconCheck,
  IconSun,
  IconMoon,
} from '../components/Icons';

export default function GuestLandingPage({ onLoginSuccess }) {
  const { login, register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValidEmailFormat = (str) => {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (trimmed.length < 6) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(trimmed);
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidEmailFormat(email)) {
      setError('Please enter a valid campus email address (e.g. name@campus.edu).');
      return;
    }

    if (isRegister) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (phoneNumber.trim()) {
        const digits = phoneNumber.replace(/\+/g, '');
        if (digits.length < 7 || digits.length > 15) {
          setError('Phone number must contain between 7 and 15 digits.');
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        await register(email.trim(), password, phoneNumber.trim() || null);
      } else {
        await login(email.trim(), password);
      }
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="guest-page-wrapper">
      <div className="guest-top-actions">
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Swiss' : 'Switch to Dark Swiss'}
          aria-label="Toggle theme mode"
        >
          {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
        </button>
      </div>

      <div className="guest-main-grid">
        {/* Left Column: Logo, Title, Description, and Feature Points */}
        <div className="guest-hero-container">
          <div className="guest-hero-crest">
            <IconLogo size={36} />
          </div>

          <h1 className="guest-hero-heading" style={{ margin: '0 0 4px 0' }}>UniCampus LAF</h1>

          <p className="guest-hero-subheading">Campus Lost & Found Management System</p>

          <p className="guest-hero-description">
            Report lost belongings, register found items and track ownership claims through a transparent campus recovery process.
          </p>

          <div className="guest-feature-list">
            <div className="guest-feature-item">
              <div className="guest-feature-icon">
                <IconShield size={16} />
              </div>
              <div className="guest-feature-text">
                <h4>Double-Blind Proof Verification</h4>
                <p>Ownership is checked using distinguishing details that aren't disclosed publicly, helping prevent fraudulent claims.</p>
              </div>
            </div>

            <div className="guest-feature-item">
              <div className="guest-feature-icon">
                <IconClock size={16} />
              </div>
              <div className="guest-feature-text">
                <h4>First-Come, First-Served Queue</h4>
                <p>Transparent queue positions with conflicting claims handled through the review process by administrators.</p>
              </div>
            </div>

            <div className="guest-feature-item">
              <div className="guest-feature-icon">
                <IconCheck size={16} />
              </div>
              <div className="guest-feature-text">
                <h4>Confirmed Physical Handover</h4>
                <p>The claimant inspects and confirms receipt of the item before the recovery process is finalized.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Full Login Card and 1-Click Login Card */}
        <div className="guest-card-container">
          {/* Card 1: Full Credentials Authentication */}
          <div className="guest-auth-card glass-panel">
            <div className="guest-tab-switch">
              <button
                type="button"
                className={`guest-tab-btn ${!isRegister ? 'active' : ''}`}
                onClick={() => { setIsRegister(false); setError(''); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`guest-tab-btn ${isRegister ? 'active' : ''}`}
                onClick={() => { setIsRegister(true); setError(''); }}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="alert-error" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="guest-form">
              <div className="form-group">
                <label htmlFor="guest-email">Campus Email</label>
                <input
                  id="guest-email"
                  type="email"
                  placeholder="e.g. abc123@xyz.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="guest-password">Password</label>
                <input
                  id="guest-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={submitting}
                />
              </div>

              {isRegister && (
                <>
                  <div className="form-group">
                    <label htmlFor="guest-confirm-password">Confirm Password</label>
                    <input
                      id="guest-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="guest-phone">
                      Phone Number <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(optional, but required for item handovers)</span>
                    </label>
                    <input
                      id="guest-phone"
                      type="tel"
                      placeholder="0911223344 or +251911223344"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '10px' }} disabled={submitting}>
                {submitting
                  ? 'Processing...'
                  : isRegister
                    ? 'Create Account'
                    : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Hero Page Footer */}
      <footer className="guest-hero-footer">
        <p>v3 &bull; built by Abdurezak Anwar, 2026</p>
      </footer>
    </div>
  );
}
