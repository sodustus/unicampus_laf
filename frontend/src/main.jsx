import React, { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'radial-gradient(ellipse at 50% 20%, #17153a 0%, #0a0b16 100%)',
          color: '#F8FAFC',
          fontFamily: 'Inter, sans-serif',
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: 'rgba(23, 21, 58, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FCA5A5', marginBottom: '10px' }}>
              Application Render Notice
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#CBD5E1', marginBottom: '20px', lineHeight: 1.5 }}>
              A client interface error occurred during view rendering. Click below to reload.
            </p>
            {this.state.error && (
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#F87171',
                textAlign: 'left',
                marginBottom: '20px',
                overflowX: 'auto',
                fontFamily: 'monospace',
              }}>
                {this.state.error.toString()}
              </div>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                color: '#fff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);

