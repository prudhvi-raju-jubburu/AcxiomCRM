import React, { useState, useEffect, useCallback } from 'react';
import {
  getCustomersApi,
  createCustomerApi,
  updateCustomerApi,
  deleteCustomerApi,
  getUsersApi,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Customer List Page
 * Displays customers with role-based filtering, search, and a unified Add/Edit modal.
 */
const CustomerListPage = () => {
  const { user, isAdmin, isManager, isSalesExecutive } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal & Form state (unified for Add and Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const initialForm = {
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    source: 'Website',
    status: 'Active',
    assignedTo: '',
    notes: '',
  };
  const [formData, setFormData] = useState(initialForm);

  // Fetch customers from backend API
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await getCustomersApi(params);
      setCustomers(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  // Fetch active users for assignment dropdown (Admin & Manager only)
  useEffect(() => {
    if (isAdmin || isManager) {
      getUsersApi({ isActive: true })
        .then((res) => setUsersList(res.data || []))
        .catch(() => setUsersList([]));
    }
  }, [isAdmin, isManager]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Open modal for creating a new customer
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData(initialForm);
    setError('');
    setShowModal(true);
  };

  // Open modal for editing an existing customer
  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      company: customer.company || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      source: customer.source || 'Website',
      status: customer.status || 'Active',
      assignedTo: customer.assignedTo?._id || customer.assignedTo || '',
      notes: customer.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  // Handle Form Submit (both Create and Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Customer name is required.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');

      const payload = { ...formData };

      // Sales Executive cannot reassign; Admin/Manager can assign or set null
      if (isSalesExecutive) {
        delete payload.assignedTo;
      } else if (!payload.assignedTo) {
        payload.assignedTo = null;
      }

      if (editingCustomer) {
        await updateCustomerApi(editingCustomer._id, payload);
        setSuccessMsg(`Customer "${formData.name}" updated successfully.`);
      } else {
        await createCustomerApi(payload);
        setSuccessMsg(`Customer "${formData.name}" created successfully.`);
      }

      setShowModal(false);
      setEditingCustomer(null);
      setFormData(initialForm);
      fetchCustomers();
    } catch (err) {
      setError(err.message || 'Failed to save customer.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Customer (Admin & Manager only)
  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      await deleteCustomerApi(customer._id);
      setSuccessMsg(`Customer "${customer.name}" deleted successfully.`);
      fetchCustomers();
    } catch (err) {
      setError(err.message || 'Failed to delete customer.');
    }
  };

  return (
    <div className="customer-list-page">
      {/* Page Header */}
      <div className="crm-page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h2 className="crm-page-title">Customers</h2>
          <p className="crm-page-subtitle">Manage customer accounts and contact information</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenAdd}>
          <span>+</span> Add Customer
        </button>
      </div>

      {/* Alert Notifications */}
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
            <div className="col-12 col-md-7">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by customer name, company, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-3">
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <button
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('');
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card crm-card">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fw-bold">Customers ({customers.length})</h5>
          <span className="badge bg-light text-dark border">
            {isSalesExecutive ? 'Assigned to Me' : 'All Accounts'}
          </span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted small">Loading customer records...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <span className="fs-1 d-block mb-2">🏢</span>
              <p className="mb-0">No customers found matching your criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Customer Name</th>
                    <th>Company</th>
                    <th>Contact Details</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Source</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c._id}>
                      <td>
                        <strong>{c.name}</strong>
                        {c.city && (
                          <div className="small text-muted">
                            {c.city}, {c.state}
                          </div>
                        )}
                      </td>
                      <td>{c.company || <span className="text-muted">—</span>}</td>
                      <td>
                        <div className="small">{c.email || 'No email'}</div>
                        <div className="small text-muted">{c.phone || 'No phone'}</div>
                      </td>
                      <td>
                        <span className={`badge ${c.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        {c.assignedTo ? (
                          <div>
                            <span className="fw-semibold small">{c.assignedTo.name}</span>
                            <span className="badge bg-light text-dark border ms-1 small">
                              {c.assignedTo.role}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted small">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <span className="badge text-bg-light border">{c.source}</span>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-outline-primary btn-sm me-2"
                          onClick={() => handleOpenEdit(c)}
                        >
                          Edit
                        </button>
                        {(isAdmin || isManager) && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeleteCustomer(c)}
                            title="Delete customer"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Unified Add / Edit Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Add New Customer'}
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
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Customer Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Reliance Retail Fleet"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Company</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Reliance Retail Ltd"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="e.g. contact@client.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. +91-9820011223"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">City</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Mumbai"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">State</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Maharashtra"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Source</label>
                      <select
                        className="form-select"
                        value={formData.source}
                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      >
                        <option value="Website">Website</option>
                        <option value="Referral">Referral</option>
                        <option value="Cold Call">Cold Call</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Event">Event</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    {(isAdmin || isManager) && (
                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold">Assign To</label>
                        <select
                          className="form-select"
                          value={formData.assignedTo}
                          onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                        >
                          <option value="">Unassigned</option>
                          {usersList.map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name} ({u.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Notes</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Additional details about this account..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      ></textarea>
                    </div>
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
                      : editingCustomer
                      ? 'Update Customer'
                      : 'Create Customer'}
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

export default CustomerListPage;
