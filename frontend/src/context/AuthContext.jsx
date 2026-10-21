import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('unicampus_token'));
  const [loading, setLoading] = useState(true);

  // Validate stored token on initial load
  useEffect(() => {
    async function verifySession() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          // Token expired or invalid
          localStorage.removeItem('unicampus_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Session verification failed:', err);
      } finally {
        setLoading(false);
      }
    }
    verifySession();
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    localStorage.setItem('unicampus_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const register = async (email, password) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed');
    }

    localStorage.setItem('unicampus_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('unicampus_token');
    setToken(null);
    setUser(null);
  };

  // Demo shortcut for fast 1-click logins during presentations
  const quickLogin = async (roleType) => {
    if (roleType === 'admin') {
      return await login('admin@campus.edu', 'AdminPass2026!');
    } else {
      return await login('student@campus.edu', 'StudentPass2026!');
    }
  };

  const checkAdminAccess = async () => {
    if (!token) throw new Error('Not logged in');
    const res = await fetch(`${BASE_URL}/auth/admin-check`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const data = await res.json();
    return {
      status: res.status,
      ok: res.ok,
      data,
    };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        quickLogin,
        checkAdminAccess,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
