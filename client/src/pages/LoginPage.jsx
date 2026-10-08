import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Login Page
 * Supports credential entry, error feedback, and interview demo quick-fill buttons.
 */
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Destination after login (default to /dashboard)
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="row justify-content-center py-5">
      <div className="col-12 col-md-8 col-lg-5">
        <div className="card crm-card shadow-sm">
          <div className="card-header bg-white text-center py-4 border-bottom">
            <span className="fs-1 d-block mb-2">💼</span>
            <h4 className="fw-bold mb-1">AcxiomCRM</h4>
            <p className="text-muted small mb-0">Sign in to your account</p>
          </div>

          <div className="card-body p-4">
            {errorMessage && (
              <div className="alert alert-danger py-2 small" role="alert">
                <strong>Error:</strong> {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold small">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small">Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-semibold mb-3"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="text-center pt-2 border-top">
                <span className="text-muted small">Don't have an account? </span>
                <Link to="/register" className="small fw-semibold text-decoration-none">
                  Register
                </Link>
              </div>
            </form>
          </div>

          <div className="card-footer bg-light text-center py-2 border-top">
            <small className="text-muted">
              AcxiomCRM &bull; Customer Relationship Management
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
