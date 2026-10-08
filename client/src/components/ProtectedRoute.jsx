import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component
 * Guards routes against unauthenticated users and checks role authorization
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }

  // If not logged in, redirect to login page while preserving intended path
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If allowed roles are specified, enforce RBAC
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger shadow-sm" role="alert">
          <h4 className="alert-heading fw-bold">⚠️ Access Denied</h4>
          <p>
            You are logged in as <strong>{user.name}</strong> with role <strong>{user.role}</strong>.
            Your role does not have permission to access this page.
          </p>
          <hr />
          <p className="mb-0">
            Please navigate to the <a href="/dashboard" className="alert-link">Dashboard</a> or contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
