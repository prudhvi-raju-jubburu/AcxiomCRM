import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginApi, getMeApi, logoutApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session from localStorage on initial load
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('acxiom_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await getMeApi();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        localStorage.removeItem('acxiom_token');
        setUser(null);
      }
    } catch (err) {
      console.warn('Session restoration failed:', err.message);
      localStorage.removeItem('acxiom_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Login handler
  const login = async (email, password) => {
    const res = await loginApi(email, password);
    if (res.success && res.data?.token) {
      localStorage.setItem('acxiom_token', res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  // Logout handler
  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('acxiom_token');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'Admin',
    isManager: user?.role === 'Manager',
    isSalesExecutive: user?.role === 'Sales Executive',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to consume authentication context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
