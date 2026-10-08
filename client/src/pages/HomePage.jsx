import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { checkBackendHealth } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Landing Page for AcxiomCRM
 * Modern, clean, and professional CRM introduction.
 */
const HomePage = () => {
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    checkBackendHealth()
      .then((res) => setHealth(res.data))
      .catch(() => setHealth(null))
      .finally(() => setLoadingHealth(false));
  }, []);

  return (
    <div className="home-page pb-5">
      {/* Hero Banner */}
      <div className="bg-white border rounded-3 p-4 p-md-5 mb-5 shadow-sm text-center text-md-start">
        <div className="row align-items-center g-4">
          <div className="col-12 col-md-8">
            <div className="d-inline-flex align-items-center gap-2 mb-3 px-3 py-1 bg-primary-subtle border border-primary-subtle rounded-pill text-primary small fw-semibold">
              <span>💼</span>
              <span>Customer Relationship Management</span>
            </div>
            <h1 className="display-5 fw-bold text-dark mb-3">
              Streamline Customer Relationships &amp; Accelerate Sales
            </h1>
            <p className="fs-6 text-muted mb-4 lead">
              AcxiomCRM provides modern pipeline management, lead conversion workflows,
              activity tracking, and role-based operational intelligence for modern teams.
            </p>
            <div className="d-flex flex-wrap justify-content-center justify-content-md-start gap-3">
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn-primary px-4 py-2 fw-semibold">
                  Go to Dashboard ({user?.role}) &rarr;
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn-primary px-4 py-2 fw-semibold">
                    Sign In &rarr;
                  </Link>
                  <Link to="/register" className="btn btn-outline-secondary px-4 py-2 fw-semibold">
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="col-12 col-md-4 text-center">
            <div className="p-4 bg-light rounded-3 border">
              <div className="display-4 mb-2">📈</div>
              <h5 className="fw-bold mb-1">Sales &amp; Pipeline Hub</h5>
              <p className="text-muted small mb-0">
                End-to-end deal progression, stage forecasting, and activity scheduling.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Core Capabilities Grid (4 Pillars) */}
      <div className="mb-5">
        <div className="text-center mb-4">
          <h3 className="fw-bold mb-1">Core Platform Capabilities</h3>
          <p className="text-muted small">Everything required to manage customer lifecycles effectively</p>
        </div>

        <div className="row g-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card crm-card h-100 p-3">
              <div className="fs-2 mb-2">🎯</div>
              <h5 className="fw-bold mb-2 fs-6">Lead &amp; Customer Funnel</h5>
              <p className="text-muted small mb-0">
                Capture prospect records, track marketing sources, and smoothly convert qualified leads into full customer accounts.
              </p>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card crm-card h-100 p-3">
              <div className="fs-2 mb-2">📈</div>
              <h5 className="fw-bold mb-2 fs-6">Sales Pipeline Deals</h5>
              <p className="text-muted small mb-0">
                Visualize opportunities through 6 standard sales stages from Prospecting to Closed Won, with win probability tracking.
              </p>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card crm-card h-100 p-3">
              <div className="fs-2 mb-2">📅</div>
              <h5 className="fw-bold mb-2 fs-6">Scheduled Activities</h5>
              <p className="text-muted small mb-0">
                Organize client calls, demos, and follow-ups linked directly to specific customers, leads, or opportunities.
              </p>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card crm-card h-100 p-3">
              <div className="fs-2 mb-2">📊</div>
              <h5 className="fw-bold mb-2 fs-6">Reports &amp; Intelligence</h5>
              <p className="text-muted small mb-0">
                Access role-specific performance metrics, conversion ratios, stage volumes, and pipeline values with date filtering.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Architecture Overview */}
      <div className="card crm-card mb-4">
        <div className="card-header bg-white py-3 border-bottom">
          <h5 className="card-title mb-0 fw-bold fs-6">Role-Based Security &amp; Access Control</h5>
        </div>
        <div className="card-body p-4">
          <div className="row g-4">
            <div className="col-12 col-md-4">
              <div className="p-3 bg-light rounded-3 border h-100">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-danger">Admin</span>
                  <strong className="small">System Administration</strong>
                </div>
                <p className="text-muted small mb-0">
                  Full organization oversight, staff user management, role assignments, and organizational reporting.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="p-3 bg-light rounded-3 border h-100">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-primary">Manager</span>
                  <strong className="small">Team &amp; Pipeline Lead</strong>
                </div>
                <p className="text-muted small mb-0">
                  Supervise sales team activities, monitor team-wide deals, review conversion funnels, and analyze performance.
                </p>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="p-3 bg-light rounded-3 border h-100">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-success">Sales Executive</span>
                  <strong className="small">Personal Portfolio</strong>
                </div>
                <p className="text-muted small mb-0">
                  Focused sales workspace strictly isolated to assigned leads, opportunities, follow-up calls, and customers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Strip */}
      <div className="p-3 bg-white border rounded-3 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 small text-muted">
        <div className="d-flex align-items-center gap-2">
          <span className={`status-dot ${health?.database?.connected ? 'online' : 'offline'}`}></span>
          <span>
            {health?.database?.connected
              ? 'Backend API & Database Operational'
              : loadingHealth
              ? 'Verifying backend connection...'
              : 'Backend service unreachable'}
          </span>
        </div>
        <div>
          <span>MERN Architecture &bull; Express.js &bull; MongoDB &bull; React &bull; Node.js</span>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
