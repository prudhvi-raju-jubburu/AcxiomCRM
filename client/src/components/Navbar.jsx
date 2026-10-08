import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Main application navigation bar with dynamic session & RBAC elements
 */
const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-danger text-white';
      case 'Manager':
        return 'bg-primary text-white';
      case 'Sales Executive':
        return 'bg-success text-white';
      default:
        return 'bg-secondary text-white';
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm py-2">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2 fw-bold fs-5" to={isAuthenticated ? "/dashboard" : "/"}>
          <span>💼</span>
          <span>AcxiomCRM</span>
        </Link>

        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-3">
            {isAuthenticated ? (
              <>
                <li className="nav-item">
                  <NavLink
                    className={({ isActive }) => `nav-link px-2 ${isActive ? 'active text-white fw-semibold' : 'text-white-50'}`}
                    to="/dashboard"
                  >
                    Dashboard
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink
                    className={({ isActive }) => `nav-link px-2 ${isActive ? 'active text-white fw-semibold' : 'text-white-50'}`}
                    to="/customers"
                  >
                    Customers
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink
                    className={({ isActive }) => `nav-link px-2 ${isActive ? 'active text-white fw-semibold' : 'text-white-50'}`}
                    to="/leads"
                  >
                    Leads
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink
                    className={({ isActive }) => `nav-link px-2 ${isActive ? 'active text-white fw-semibold' : 'text-white-50'}`}
                    to="/opportunities"
                  >
                    Opportunities
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink
                    className={({ isActive }) => `nav-link px-2 ${isActive ? 'active text-white fw-semibold' : 'text-white-50'}`}
                    to="/followups"
                  >
                    Follow-Ups
                  </NavLink>
                </li>

                <li className="nav-item">
                  <NavLink
                    className={({ isActive }) => `nav-link px-2 ${isActive ? 'active text-white fw-semibold' : 'text-white-50'}`}
                    to="/reports"
                  >
                    Reports
                  </NavLink>
                </li>

                {isAdmin && (
                  <li className="nav-item">
                    <NavLink
                      className={({ isActive }) => `nav-link px-2 ${isActive ? 'active text-warning fw-semibold' : 'text-warning-emphasis'}`}
                      to="/users"
                    >
                      Users
                    </NavLink>
                  </li>
                )}
              </>
            ) : (
              <li className="nav-item">
                <NavLink className={({ isActive }) => `nav-link px-2 ${isActive ? 'active text-white fw-semibold' : 'text-white-50'}`} to="/">
                  Home
                </NavLink>
              </li>
            )}
          </ul>

          <div className="d-flex align-items-center gap-3">
            {isAuthenticated ? (
              <div className="d-flex align-items-center gap-3">
                <div className="text-end d-none d-sm-block">
                  <div className="text-white small fw-bold lh-1 mb-1">{user?.name}</div>
                  <span className={`badge ${getRoleBadgeClass(user?.role)}`}>
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn btn-outline-light btn-sm px-3"
                  title="Sign out of AcxiomCRM"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <Link to="/login" className="btn btn-outline-light btn-sm px-3">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm px-3">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
