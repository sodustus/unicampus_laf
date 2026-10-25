import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  IconLogo,
  IconAlert,
  IconShield,
  IconClock,
  IconCheck,
} from '../components/Icons';

export default function GuestLandingPage({ onLoginSuccess }) {
  const { login, register, quickLogin } = useAuth();
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

  const handleQuickLogin = async (role) => {
    setError('');
    setSubmitting(true);
    try {
      await quickLogin(role);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Quick login failed.');
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
          title="Toggle Dark/Light Swiss"
        >
          {isDark ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
          <span>{isDark ? 'Dark Swiss' : 'Light Swiss'}</span>
        </button>
      </div>

      <div className="guest-main-grid">
        {/* Left Column: Logo, Title, Description, and Feature Points */}
        <div className="guest-hero-container">
          <div className="guest-hero-crest">
            <IconLogo size={36} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h1 className="guest-hero-heading" style={{ margin: 0 }}>UniCampus LAF</h1>
            <span className="badge badge-info" style={{ fontSize: '0.74rem', padding: '3px 9px', fontWeight: 700 }}>
              v3.0
            </span>
          </div>

          <p className="guest-hero-subheading">Campus Lost & Found Management System</p>

          <p className="guest-hero-description">
            A centralized verification and custody coordination network. Securely report lost belongings, list found items, track verified ownership claims, and coordinate safe handovers across campus.
          </p>

          <div className="guest-feature-list">
            <div className="guest-feature-item">
              <div className="guest-feature-icon">
                <IconShield size={16} />
              </div>
              <div className="guest-feature-text">
                <h4>Double-Blind Proof Verification</h4>
                <p>Private distinguishing marks, stickers, and serial numbers are kept confidential to prevent fraudulent claims.</p>
              </div>
            </div>

            <div className="guest-feature-item">
              <div className="guest-feature-icon">
                <IconClock size={16} />
              </div>
              <div className="guest-feature-text">
                <h4>First-Come, First-Served Queue</h4>
                <p>Transparent queue positions with automatic multi-claim conflict suspension to ensure fair processing.</p>
              </div>
            </div>

            <div className="guest-feature-item">
              <div className="guest-feature-icon">
                <IconCheck size={16} />
              </div>
              <div className="guest-feature-text">
                <h4>Verified Two-Step Physical Handover</h4>
                <p>Owners must physically inspect and confirm item receipt before administrators finalize item recovery.</p>
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
                  placeholder="e.g. abebebikila@campus.edu"
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
                      Phone Number <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(Optional for Handover)</span>
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
                    ? 'Create Student Account'
                    : 'Sign In to Campus Hub'}
              </button>
            </form>
          </div>

          {/* Card 2: 1-Click Multi-User Logins */}
          <div className="guest-quick-card glass-panel">
            <div className="guest-quick-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>1-Click Multi-User Logins</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 12px 0' }}>
              Instant sign-in with pre-seeded campus roles and test personas:
            </p>
            <div className="guest-quick-grid">
              <button
                type="button"
                className="btn-quick-login"
                onClick={() => handleQuickLogin('abebe')}
                disabled={submitting}
                title="Abebe Bikila (Computer Science & IT) - abebebikila@campus.edu"
              >
                Abebe Bikila
              </button>
              <button
                type="button"
                className="btn-quick-login"
                onClick={() => handleQuickLogin('fatuma')}
                disabled={submitting}
                title="Fatuma Roba (Electrical Engineering) - fatumaroba@campus.edu"
              >
                Fatuma Roba
              </button>
              <button
                type="button"
                className="btn-quick-login"
                onClick={() => handleQuickLogin('derartu')}
                disabled={submitting}
                title="Derartu Tulu (Mechanical Engineering) - derartutulu@campus.edu"
              >
                Derartu Tulu
              </button>
              <button
                type="button"
                className="btn-quick-login"
                onClick={() => handleQuickLogin('kenenisa')}
                disabled={submitting}
                title="Kenenisa Bekele (Civil Engineering) - kenenisabekele@campus.edu"
              >
                Kenenisa Bekele
              </button>
              <button
                type="button"
                className="btn-quick-login"
                onClick={() => handleQuickLogin('haile')}
                disabled={submitting}
                title="Haile Gebrselassie (Business Administration) - hailegebrselassie@campus.edu"
              >
                Haile Gebrselassie
              </button>
              <button
                type="button"
                className="btn-quick-login btn-quick-admin"
                onClick={() => handleQuickLogin('admin')}
                disabled={submitting}
                title="Campus Administrator - admin@campus.edu"
              >
                Admin Console
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Page Footer */}
      <footer className="guest-hero-footer">
        <p>v3.0 &bull; built by Abdurezak Anwar, 2026</p>
      </footer>
    </div>
  );
}
