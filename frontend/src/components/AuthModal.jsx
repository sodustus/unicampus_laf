import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, quickLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
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
