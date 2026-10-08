import React, { useState, useEffect, useCallback } from 'react';
import {
  getLeadsApi,
  createLeadApi,
  updateLeadApi,
  deleteLeadApi,
  convertLeadApi,
  getUsersApi,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Lead List Page
 * Lifecycle pipeline management: New, Contacted, Qualified, Lost, and Converted.
 * Provides Lead-to-Customer conversion workflow and role-based filtering.
 */
const LeadListPage = () => {
  const { user, isAdmin, isManager, isSalesExecutive } = useAuth();

  const [leads, setLeads] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const initialForm = {
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'Website',
    status: 'New',
    assignedTo: '',
    notes: '',
  };
  const [formData, setFormData] = useState(initialForm);

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await getLeadsApi(params);
      setLeads(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load leads.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  // Load active users for assignment (Admin & Manager only)
  useEffect(() => {
    if (isAdmin || isManager) {
      getUsersApi({ isActive: true })
        .then((res) => setUsersList(res.data || []))
        .catch(() => setUsersList([]));
    }
  }, [isAdmin, isManager]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Handle Create Lead
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Lead name is required.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');
      const payload = { ...formData };
      if (!payload.assignedTo) delete payload.assignedTo;

      await createLeadApi(payload);
      setSuccessMsg(`Lead "${formData.name}" added to pipeline.`);
      setShowCreateModal(false);
      setFormData(initialForm);
      fetchLeads();
    } catch (err) {
      setError(err.message || 'Failed to create lead.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (lead) => {
    setSelectedLead(lead);
    setFormData({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      source: lead.source || 'Website',
      status: lead.status || 'New',
      assignedTo: lead.assignedTo?._id || lead.assignedTo || '',
      notes: lead.notes || '',
    });
    setError('');
    setShowEditModal(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');
      const payload = { ...formData };
      if (isSalesExecutive) {
        delete payload.assignedTo;
      } else if (!payload.assignedTo) {
        payload.assignedTo = null;
      }

      await updateLeadApi(selectedLead._id, payload);
      setSuccessMsg(`Lead "${formData.name}" updated successfully.`);
      setShowEditModal(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (err) {
      setError(err.message || 'Failed to update lead.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Convert to Customer
  const handleConvertLead = async (lead) => {
    if (
      !window.confirm(
        `Are you sure you want to convert "${lead.name}" (${lead.company || 'Individual'}) into an active Customer account?`
      )
    ) {
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      const res = await convertLeadApi(lead._id);
      setSuccessMsg(
        `🎉 Successfully converted lead "${lead.name}" into Customer "${res.data.customer?.name}"!`
      );
      fetchLeads();
    } catch (err) {
      setError(err.message || 'Failed to convert lead to customer.');
    }
  };

  // Handle Delete Lead
  const handleDeleteLead = async (lead) => {
    if (!window.confirm(`Are you sure you want to delete lead "${lead.name}"?`)) {
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      await deleteLeadApi(lead._id);
      setSuccessMsg(`Lead "${lead.name}" deleted.`);
      fetchLeads();
    } catch (err) {
      setError(err.message || 'Failed to delete lead.');
    }
  };

  // Badge styling helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <span className="badge bg-info text-dark">New</span>;
      case 'Contacted':
        return <span className="badge bg-warning text-dark">Contacted</span>;
      case 'Qualified':
        return <span className="badge bg-primary">Qualified</span>;
      case 'Converted':
        return <span className="badge bg-success">Converted</span>;
      case 'Lost':
        return <span className="badge bg-secondary">Lost</span>;
      default:
        return <span className="badge bg-light text-dark">{status}</span>;
    }
  };

  return (
    <div className="lead-list-page">
      {/* Page Header */}
      <div className="crm-page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h2 className="crm-page-title">Leads</h2>
          <p className="crm-page-subtitle">
            Track and manage potential customers
          </p>
        </div>
        <button
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={() => {
            setError('');
            setFormData(initialForm);
            setShowCreateModal(true);
          }}
        >
          <span>+</span> Add Lead
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
            <div className="col-12 col-md-7">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by prospect name, company, or email..."
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
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
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

      {/* Leads Table */}
      <div className="card crm-card">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fw-bold">Active Leads ({leads.length})</h5>
          <span className="badge bg-light text-dark border">
            {isSalesExecutive ? 'My Assigned Leads' : 'All Leads'}
          </span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted small">Loading sales leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <span className="fs-1 d-block mb-2">🎯</span>
              <p className="mb-0">No leads found in this view.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Lead Name</th>
                    <th>Company</th>
                    <th>Contact Details</th>
                    <th>Status</th>
                    <th>Assigned Executive</th>
                    <th>Source</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => {
                    const isConverted = l.status === 'Converted';
                    const isLost = l.status === 'Lost';
                    const canConvert = !isConverted && !isLost;

                    return (
                      <tr key={l._id}>
                        <td>
                          <strong>{l.name}</strong>
                          {l.notes && (
                            <div className="small text-muted text-truncate" style={{ maxWidth: '200px' }}>
                              {l.notes}
                            </div>
                          )}
                        </td>
                        <td>{l.company || <span className="text-muted">—</span>}</td>
                        <td>
                          <div className="small">{l.email || 'No email'}</div>
                          <div className="small text-muted">{l.phone || 'No phone'}</div>
                        </td>
                        <td>
                          {getStatusBadge(l.status)}
                          {isConverted && (
                            <div className="small text-success mt-1 fw-semibold">
                              ✓ Customer Created
                            </div>
                          )}
                        </td>
                        <td>
                          {l.assignedTo ? (
                            <div>
                              <span className="fw-semibold small">{l.assignedTo.name}</span>
                              <span className="badge bg-light text-dark border ms-1 small">
                                {l.assignedTo.role}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted small">Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span className="badge text-bg-light border">{l.source}</span>
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {canConvert && (
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => handleConvertLead(l)}
                                title="Convert Lead into Customer Account"
                              >
                                Convert ➔
                              </button>
                            )}

                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => openEditModal(l)}
                              disabled={isConverted}
                              title={isConverted ? 'Converted leads cannot be modified' : 'Edit Lead'}
                            >
                              Edit
                            </button>

                            {(isAdmin || isManager) && (
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleDeleteLead(l)}
                                title="Delete Lead"
                              >
                                Delete
                              </button>
                            )}
                          </div>
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

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Capture New Lead</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                  disabled={actionLoading}
                ></button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Lead Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Ramesh Chandra"
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
                        placeholder="e.g. Apex Tech Solutions"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="e.g. ramesh@apex.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. +91-9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Lead Source</label>
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
                      <label className="form-label small fw-semibold">Initial Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>
                    {(isAdmin || isManager) && (
                      <div className="col-12 col-md-4">
                        <label className="form-label small fw-semibold">Assign To Executive</label>
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
                      <label className="form-label small fw-semibold">Notes & Context</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Customer requirement, deal size estimation, discussion summary..."
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
                    onClick={() => setShowCreateModal(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : 'Save Lead'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditModal && selectedLead && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Edit Lead: {selectedLead.name}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                  disabled={actionLoading}
                ></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Lead Name *</label>
                      <input
                        type="text"
                        className="form-control"
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
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Lifecycle Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </div>
                    {(isAdmin || isManager) ? (
                      <div className="col-12 col-md-8">
                        <label className="form-label small fw-semibold">Reassign Executive</label>
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
                    ) : (
                      <div className="col-12 col-md-8">
                        <label className="form-label small fw-semibold">Assigned Executive</label>
                        <input
                          type="text"
                          className="form-control"
                          value={user?.name}
                          disabled
                        />
                        <small className="text-muted">Sales Executives cannot reassign leads.</small>
                      </div>
                    )}
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Notes</label>
                      <textarea
                        className="form-control"
                        rows="2"
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

export default LeadListPage;
