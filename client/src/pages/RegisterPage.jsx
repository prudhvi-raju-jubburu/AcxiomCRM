import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerApi } from '../services/api';

/**
 * Public User Registration Page
 * Allows new users to self-register with default Sales Executive role.
 */
const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const navigate = useNavigate();

  const validateForm = () => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return false;
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your confirm password.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const res = await registerApi({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.success) {
        setSuccessMessage('Registration successful! You can now log in with your credentials.');
      }
    } catch (err) {
      console.error('Registration failed:', err);
      if (err.status === 409) {
        setErrorMessage('This email is already registered. Please use another email or log in.');
      } else {
        setErrorMessage(
          err.message || 'Registration failed. Please verify your details and try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="row justify-content-center py-4">
      <div className="col-12 col-md-8 col-lg-5">
        <div className="card crm-card shadow-sm">
          <div className="card-header bg-white text-center py-3 border-bottom">
            <span className="fs-1 d-block mb-1">💼</span>
            <h4 className="fw-bold mb-1">AcxiomCRM</h4>
            <p className="text-muted small mb-0">Create your account</p>
          </div>

          <div className="card-body p-4">
            {/* Informational RBAC notice */}
            <div className="alert alert-info py-2 small mb-3" role="alert">
              New accounts are registered as <strong>Sales Executive</strong>.
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="alert alert-danger py-2 small" role="alert">
                <strong>Error:</strong> {errorMessage}
              </div>
            )}

            {/* Success State */}
            {successMessage ? (
              <div className="text-center py-3">
                <div className="alert alert-success py-3 mb-4" role="alert">
                  <h5 className="alert-heading fw-bold mb-1">Registration Successful!</h5>
                  <p className="mb-0 small">{successMessage}</p>
                </div>
                <Link to="/login" className="btn btn-primary w-100 py-2 fw-semibold">
                  Go to Login →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. john@example.com"
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
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <div className="form-text small">Must be at least 6 characters.</div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Confirm Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Creating Account...
                    </>
                  ) : (
                    'Register'
                  )}
                </button>

                <div className="text-center pt-2 border-top">
                  <span className="text-muted small">Already have an account? </span>
                  <Link to="/login" className="small fw-semibold text-decoration-none">
                    Login
                  </Link>
                </div>
              </form>
            )}
          </div>

          <div className="card-footer bg-light text-center py-2 border-top">
            <small className="text-muted">
              Acxiom Consulting Recruitment Project — Secure Role-Based Access Control
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
