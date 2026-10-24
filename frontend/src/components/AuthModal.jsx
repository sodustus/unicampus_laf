import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, quickLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  // Strict email validation checking user@domain.tld structure
  const isValidEmailFormat = (str) => {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (trimmed.length < 6) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(trimmed);
  };

  // Real-time phone number filter: strips out letters/symbols, enforces 10 chars for 09... and 13 chars for +251...
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Reject invalid email format or gibberish
    if (!isValidEmailFormat(email)) {
      setError('Please enter a valid email address (e.g. yourname@campus.edu).');
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
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication error.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (role) => {
    setError('');
    setSubmitting(true);
    try {
      await quickLogin(role);
      onClose();
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon">{isRegister ? '📝' : '🔐'}</span>
            <div>
              <h3>{isRegister ? 'Create UniCampus Account' : 'Welcome Back'}</h3>
              <p className="modal-subtitle">
                {isRegister
                  ? 'Sign up to report lost items and track belongings'
                  : 'Log in with your university account credentials'}
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Presentation Fast-Track Demo Logins */}
        <div className="demo-login-box">
          <span className="demo-label">⚡ 1-Click Multi-User Logins (Demo & Testing):</span>
          <div className="demo-btns" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-demo-user"
              onClick={() => handleQuickLogin('student0')}
              disabled={submitting}
              title="Abebe Bikila (Computer Science) - Password: password0"
            >
              👤 Student 0 (Abebe)
            </button>
            <button
              type="button"
              className="btn btn-demo-user"
              onClick={() => handleQuickLogin('student1')}
              disabled={submitting}
              title="Fatuma Roba (Electrical Eng.) - Password: password1"
            >
              👤 Student 1 (Fatuma)
            </button>
            <button
              type="button"
              className="btn btn-demo-user"
              onClick={() => handleQuickLogin('student2')}
              disabled={submitting}
              title="Derartu Tulu (Mechanical Eng.) - Password: password2"
            >
              👤 Student 2 (Derartu)
            </button>
            <button
              type="button"
              className="btn btn-demo-admin"
              onClick={() => handleQuickLogin('admin')}
              disabled={submitting}
              title="Campus Administrator - Password: AdminPass2026!"
            >
              🛡️ Admin Console
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="tab-switcher">
          <button
            type="button"
            className={`tab-btn ${!isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(false); setError(''); }}
          >
            Log In
          </button>
          <button
            type="button"
            className={`tab-btn ${isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(true); setError(''); }}
          >
            Register
          </button>
        </div>

        {/* Error message banner */}
        {error && <div className="alert-error">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="auth-email">Campus Email</label>
            <input
              id="auth-email"
              type="email"
              placeholder="e.g. yourname@campus.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label htmlFor="auth-confirm">Confirm Password</label>
                <input
                  id="auth-confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="form-group">
                <label htmlFor="auth-phone">
                  Contact Phone Number <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Digits only, optional)</span>
                </label>
                <input
                  id="auth-phone"
                  type="tel"
                  placeholder="e.g. +251983072052 or 0983072052"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  maxLength={phoneNumber.startsWith('+') ? 13 : 10}
                />
                <span className="field-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  🔒 Numbers only. Limits: 10 digits for 09... or 13 chars for +251...
                </span>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
