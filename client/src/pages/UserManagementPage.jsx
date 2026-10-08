import React, { useState, useEffect, useCallback } from 'react';
import { getUsersApi, createUserApi, updateUserApi, toggleUserStatusApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * User Management Page (Admin Only)
 * Allows Admin to search, view, create, edit, and activate/deactivate users.
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

  // Modal / Form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // New User Form State
  const [newFormData, setNewFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Sales Executive',
  });

  // Edit User Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    role: 'Sales Executive',
    password: '',
  });

  const [actionLoading, setActionLoading] = useState(false);

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

  // Handle Create User
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!newFormData.name || !newFormData.email || !newFormData.password) {
      setError('Name, email, and password are required.');
      return;
    }

    try {
      setActionLoading(true);
      await createUserApi(newFormData);
      setSuccessMsg(`User ${newFormData.name} created successfully.`);
      setShowCreateModal(false);
      setNewFormData({ name: '', email: '', password: '', role: 'Sales Executive' });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (u) => {
    setSelectedUser(u);
    setEditFormData({
      name: u.name,
      email: u.email,
      role: u.role,
      password: '',
    });
    setError('');
    setShowEditModal(true);
  };

  // Handle Edit User
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError('');
    setSuccessMsg('');

    try {
      setActionLoading(true);
      const updatePayload = {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
      };
      if (editFormData.password.trim()) {
        updatePayload.password = editFormData.password.trim();
      }

      await updateUserApi(selectedUser._id, updatePayload);
      setSuccessMsg(`User ${editFormData.name} updated successfully.`);
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Toggle Status (Activate / Deactivate)
  const handleToggleStatus = async (userToToggle) => {
    if (userToToggle._id === currentAdmin.id) {
      setError('You cannot deactivate your own administrative account.');
      return;
    }

    const actionText = userToToggle.isActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionText} ${userToToggle.name}?`)) {
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      await toggleUserStatusApi(userToToggle._id);
      setSuccessMsg(`User ${userToToggle.name} status updated.`);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Admin':
        return 'bg-danger';
      case 'Manager':
        return 'bg-primary';
      case 'Sales Executive':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <div className="user-management-page">
      {/* Header */}
      <div className="crm-page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h2 className="crm-page-title">User Management</h2>
          <p className="crm-page-subtitle">
            Manage CRM users and roles
          </p>
        </div>
        <button
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={() => {
            setError('');
            setShowCreateModal(true);
          }}
        >
          <span>+</span> Add User
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

      {/* Search & Filter Toolbar */}
      <div className="card crm-card mb-4">
        <div className="card-body p-3">
          <div className="row g-2">
            <div className="col-12 col-md-5">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by name or email..."
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
            <div className="col-6 col-md-3">
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
            <div className="col-12 col-md-1">
              <button
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('');
                  setStatusFilter('');
                }}
                title="Clear filters"
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
          <span className="badge bg-light text-dark border">Admin Authorized</span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted small">Loading user directory...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p className="mb-0">No users found matching the selected criteria.</p>
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
                    <th>Created</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u._id === currentAdmin.id;
                    return (
                      <tr key={u._id}>
                        <td>
                          <strong>{u.name}</strong>
                          {isSelf && <span className="badge bg-info-subtle text-info-emphasis ms-2 small">You</span>}
                        </td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge ${getRoleBadgeClass(u.role)}`}>{u.role}</span>
                        </td>
                        <td>
                          {u.isActive ? (
                            <span className="badge bg-success">Active</span>
                          ) : (
                            <span className="badge bg-secondary">Inactive</span>
                          )}
                        </td>
                        <td className="small text-muted">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-outline-primary btn-sm me-2"
                            onClick={() => openEditModal(u)}
                            title="Edit User"
                          >
                            Edit
                          </button>
                          <button
                            className={`btn btn-sm ${u.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSelf}
                            title={isSelf ? 'Cannot deactivate self' : u.isActive ? 'Deactivate' : 'Activate'}
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

      {/* Create User Modal (rendered as clean backdrop overlay) */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Create New User</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                  disabled={actionLoading}
                ></button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newFormData.name}
                      onChange={(e) => setNewFormData({ ...newFormData, name: e.target.value })}
                      placeholder="e.g. Jane Doe"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={newFormData.email}
                      onChange={(e) => setNewFormData({ ...newFormData, email: e.target.value })}
                      placeholder="e.g. jane@acxiom.com"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Initial Password * (min 6 chars)</label>
                    <input
                      type="password"
                      className="form-control"
                      value={newFormData.password}
                      onChange={(e) => setNewFormData({ ...newFormData, password: e.target.value })}
                      placeholder="Set initial password"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Assigned Role *</label>
                    <select
                      className="form-select"
                      value={newFormData.role}
                      onChange={(e) => setNewFormData({ ...newFormData, role: e.target.value })}
                    >
                      <option value="Sales Executive">Sales Executive</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowCreateModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={actionLoading}>
                    {actionLoading ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Edit User: {selectedUser.name}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                  disabled={actionLoading}
                ></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Role *</label>
                    <select
                      className="form-select"
                      value={editFormData.role}
                      onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                      disabled={selectedUser._id === currentAdmin.id}
                    >
                      <option value="Sales Executive">Sales Executive</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin">Admin</option>
                    </select>
                    {selectedUser._id === currentAdmin.id && (
                      <small className="text-muted">You cannot change your own Admin role.</small>
                    )}
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Reset Password (leave empty to keep current)</label>
                    <input
                      type="password"
                      className="form-control"
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      placeholder="Optional new password"
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowEditModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : 'Save Changes'}
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
