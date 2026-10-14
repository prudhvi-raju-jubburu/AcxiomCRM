import React, { useState, useEffect, useCallback } from 'react';
import { getUsersApi, createUserApi, updateUserApi, toggleUserStatusApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * User Management Page (Admin Only)
 * Allows Admin to search, view, create, edit, and activate/deactivate users
 * with a unified Add/Edit modal.
 */
const UserManagementPage = () => {
  const { user: currentAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal & Form state (unified for Add and Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const initialForm = {
    name: '',
    email: '',
    password: '',
    role: 'Sales Executive',
  };
  const [formData, setFormData] = useState(initialForm);

  // Fetch users with current query parameters
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter !== '') params.isActive = statusFilter;

      const res = await getUsersApi(params);
      setUsers(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open modal for creating a new user
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData(initialForm);
    setError('');
    setShowModal(true);
  };

  // Open modal for editing an existing user
  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'Sales Executive',
      password: '', // Optional on edit
    });
    setError('');
    setShowModal(true);
  };

  // Handle Form Submit (both Create and Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and email are required.');
      return;
    }

    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setActionLoading(true);

      if (editingUser) {
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
        };
        // Only include password if explicitly provided
        if (formData.password && formData.password.trim().length >= 6) {
          payload.password = formData.password.trim();
        }

        await updateUserApi(editingUser._id, payload);
        setSuccessMsg(`User "${formData.name}" updated successfully.`);
      } else {
        await createUserApi({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: formData.role,
        });
        setSuccessMsg(`User "${formData.name}" created successfully.`);
      }

      setShowModal(false);
      setEditingUser(null);
      setFormData(initialForm);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to save user.');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle user activation status
  const handleToggleStatus = async (targetUser) => {
    if (targetUser._id === currentAdmin.id || targetUser._id === currentAdmin._id) {
      setError('You cannot deactivate your own administrative account.');
      return;
    }

    const action = targetUser.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} user "${targetUser.name}"?`)) {
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      await toggleUserStatusApi(targetUser._id);
      setSuccessMsg(`User "${targetUser.name}" ${targetUser.isActive ? 'deactivated' : 'activated'} successfully.`);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to toggle user status.');
    }
  };

  // Role badge color helper
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
    <div className="user-management-page">
      {/* Page Header */}
      <div className="crm-page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h2 className="crm-page-title">User Management</h2>
          <p className="crm-page-subtitle">Admin control center for team accounts and role-based permissions</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenAdd}>
          <span>+</span> Create New User
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show small" role="alert">
          <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success alert-dismissible fade show small" role="alert">
          <strong>Success:</strong> {successMsg}
          <button type="button" className="btn-close" onClick={() => setSuccessMsg('')}></button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="card crm-card mb-4">
        <div className="card-body p-3">
          <div className="row g-2">
            <div className="col-12 col-md-5">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-3">
              <select
                className="form-select form-select-sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Sales Executive">Sales Executive</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>
            <div className="col-12 col-md-2">
              <button
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('');
                  setStatusFilter('');
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card crm-card">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fw-bold">System Users ({users.length})</h5>
          <span className="badge bg-light text-dark border">Admin Control</span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted small">Loading user directory...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <span className="fs-1 d-block mb-2">👥</span>
              <p className="mb-0">No users found matching your search.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u._id === currentAdmin.id || u._id === currentAdmin._id;
                    return (
                      <tr key={u._id}>
                        <td>
                          <strong>{u.name}</strong>
                          {isSelf && <span className="badge bg-secondary ms-2 small">You</span>}
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${getRoleBadgeClass(u.role)}`}>{u.role}</span>
                        </td>
                        <td>
                          <span className={`badge ${u.isActive ? 'bg-success' : 'bg-danger'}`}>
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td>
                          <span className="small text-muted">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-outline-primary btn-sm me-2"
                            onClick={() => handleOpenEdit(u)}
                          >
                            Edit
                          </button>
                          <button
                            className={`btn btn-sm ${u.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSelf}
                            title={isSelf ? 'Cannot deactivate self' : u.isActive ? 'Deactivate user' : 'Activate user'}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Unified Add / Edit Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingUser ? `Edit User: ${editingUser.name}` : 'Create New User'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                  disabled={actionLoading}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Jane Doe"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. jane@acxiom.com"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      {editingUser ? 'Reset Password (optional, min 6 chars)' : 'Initial Password * (min 6 chars)'}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password'}
                      required={!editingUser}
                      minLength={6}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Assigned Role *</label>
                    <select
                      className="form-select"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      disabled={editingUser && (editingUser._id === currentAdmin.id || editingUser._id === currentAdmin._id)}
                    >
                      <option value="Sales Executive">Sales Executive</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                    {editingUser && (editingUser._id === currentAdmin.id || editingUser._id === currentAdmin._id) && (
                      <div className="form-text small text-muted">
                        You cannot change your own administrative role.
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={actionLoading}>
                    {actionLoading
                      ? 'Saving...'
                      : editingUser
                      ? 'Update User'
                      : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
