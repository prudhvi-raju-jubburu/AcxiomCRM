import React, { useState, useEffect, useCallback } from 'react';
import {
  getFollowUpsApi,
  createFollowUpApi,
  updateFollowUpApi,
  deleteFollowUpApi,
  getCustomersApi,
  getLeadsApi,
  getOpportunitiesApi,
  getUsersApi,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Follow-Up & Sales Activities Page
 * Schedules and tracks interactions (Calls, Emails, Meetings, Visits) linked to Customers, Leads, and Opportunities.
 */
const FollowUpListPage = () => {
  const { user, isAdmin, isManager, isSalesExecutive } = useAuth();

  const [followUps, setFollowUps] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [opportunitiesList, setOpportunitiesList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const initialForm = {
    subject: '',
    type: 'Call',
    customer: '',
    lead: '',
    opportunity: '',
    assignedTo: '',
    scheduledDate: '',
    status: 'Pending',
    description: '',
    notes: '',
  };
  const [formData, setFormData] = useState(initialForm);

  // Fetch follow-ups
  const fetchFollowUps = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const res = await getFollowUpsApi(params);
      setFollowUps(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load follow-up activities.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  // Load relation dropdown data
  useEffect(() => {
    getCustomersApi()
      .then((res) => setCustomersList(res.data || []))
      .catch(() => setCustomersList([]));

    getLeadsApi()
      .then((res) => setLeadsList(res.data || []))
      .catch(() => setLeadsList([]));

    getOpportunitiesApi()
      .then((res) => setOpportunitiesList(res.data || []))
      .catch(() => setOpportunitiesList([]));

    if (isAdmin || isManager) {
      getUsersApi({ isActive: true })
        .then((res) => setUsersList(res.data || []))
        .catch(() => setUsersList([]));
    }
  }, [isAdmin, isManager]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Handle Create Follow-Up
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.subject.trim()) {
      setError('Follow-up subject is required.');
      return;
    }

    if (!formData.scheduledDate) {
      setError('Scheduled date is required.');
      return;
    }

    if (!formData.customer && !formData.lead && !formData.opportunity) {
      setError('Please associate this activity with at least one record (Customer, Lead, or Opportunity).');
      return;
    }

    try {
      setActionLoading(true);
      const payload = { ...formData };
      if (!payload.customer) delete payload.customer;
      if (!payload.lead) delete payload.lead;
      if (!payload.opportunity) delete payload.opportunity;
      if (!payload.assignedTo) delete payload.assignedTo;

      await createFollowUpApi(payload);
      setSuccessMsg(`Activity "${formData.subject}" scheduled.`);
      setShowCreateModal(false);
      setFormData(initialForm);
      fetchFollowUps();
    } catch (err) {
      setError(err.message || 'Failed to schedule activity.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (fu) => {
    setSelectedFollowUp(fu);
    const dateFormatted = fu.scheduledDate
      ? new Date(fu.scheduledDate).toISOString().slice(0, 16)
      : '';

    setFormData({
      subject: fu.subject || '',
      type: fu.type || 'Call',
      customer: fu.customer?._id || fu.customer || '',
      lead: fu.lead?._id || fu.lead || '',
      opportunity: fu.opportunity?._id || fu.opportunity || '',
      assignedTo: fu.assignedTo?._id || fu.assignedTo || '',
      scheduledDate: dateFormatted,
      status: fu.status || 'Pending',
      description: fu.description || '',
      notes: fu.notes || '',
    });
    setError('');
    setShowEditModal(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFollowUp) return;

    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');
      const payload = { ...formData };
      if (isSalesExecutive) {
        delete payload.assignedTo;
      }

      await updateFollowUpApi(selectedFollowUp._id, payload);
      setSuccessMsg(`Follow-up "${formData.subject}" updated.`);
      setShowEditModal(false);
      setSelectedFollowUp(null);
      fetchFollowUps();
    } catch (err) {
      setError(err.message || 'Failed to update follow-up.');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Status Transition (e.g. mark Completed or Cancelled)
  const handleQuickStatusChange = async (fu, targetStatus) => {
    try {
      setError('');
      setSuccessMsg('');
      await updateFollowUpApi(fu._id, { status: targetStatus });
      setSuccessMsg(`Activity marked as ${targetStatus}.`);
      fetchFollowUps();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  };

  // Handle Delete
  const handleDeleteFollowUp = async (fu) => {
    if (!window.confirm(`Are you sure you want to delete activity "${fu.subject}"?`)) {
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      await deleteFollowUpApi(fu._id);
      setSuccessMsg(`Activity "${fu.subject}" deleted.`);
      fetchFollowUps();
    } catch (err) {
      setError(err.message || 'Failed to delete activity.');
    }
  };

  // Helpers for Badges
  const getTypeBadge = (type) => {
    switch (type) {
      case 'Call':
        return <span className="badge text-bg-primary">📞 Call</span>;
      case 'Email':
        return <span className="badge text-bg-info">✉️ Email</span>;
      case 'Meeting':
        return <span className="badge text-bg-success">👥 Meeting</span>;
      case 'Visit':
        return <span className="badge text-bg-warning text-dark">🚗 Visit</span>;
      default:
        return <span className="badge text-bg-secondary">📋 {type}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return <span className="badge bg-warning text-dark">Pending</span>;
      case 'Completed':
        return <span className="badge bg-success">Completed</span>;
      case 'Cancelled':
        return <span className="badge bg-secondary">Cancelled</span>;
      default:
        return <span className="badge bg-light text-dark">{status}</span>;
    }
  };

  return (
    <div className="followup-list-page">
      {/* Header */}
      <div className="crm-page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h2 className="crm-page-title">Follow-Ups</h2>
          <p className="crm-page-subtitle">
            Manage customer and sales activities
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
          <span>+</span> Add Follow-Up
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
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses (Pending, Completed, Cancelled)</option>
                <option value="Pending">Pending Only</option>
                <option value="Completed">Completed Only</option>
                <option value="Cancelled">Cancelled Only</option>
              </select>
            </div>
            <div className="col-12 col-md-5">
              <select
                className="form-select form-select-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Interaction Types (Calls, Meetings, Emails...)</option>
                <option value="Call">Call</option>
                <option value="Email">Email</option>
                <option value="Meeting">Meeting</option>
                <option value="Visit">Visit</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="col-12 col-md-2">
              <button
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={() => {
                  setStatusFilter('');
                  setTypeFilter('');
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Activities Table */}
      <div className="card crm-card">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fw-bold">Scheduled Activities ({followUps.length})</h5>
          <span className="badge bg-light text-dark border">
            {isSalesExecutive ? 'Assigned to Me' : 'Team Activity Feed'}
          </span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted small">Loading sales activities...</p>
            </div>
          ) : followUps.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <span className="fs-1 d-block mb-2">📅</span>
              <p className="mb-0">No follow-ups or activities found.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Subject</th>
                    <th>Type</th>
                    <th>Related Record</th>
                    <th>Scheduled Date</th>
                    <th>Status</th>
                    <th>Executive</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {followUps.map((fu) => {
                    const isPending = fu.status === 'Pending';
                    return (
                      <tr key={fu._id}>
                        <td>
                          <strong>{fu.subject}</strong>
                          {fu.notes && (
                            <div className="small text-muted text-truncate" style={{ maxWidth: '250px' }}>
                              Note: {fu.notes}
                            </div>
                          )}
                        </td>
                        <td>{getTypeBadge(fu.type)}</td>
                        <td>
                          {fu.customer && (
                            <div>
                              <span className="badge bg-light text-primary border me-1">Customer</span>
                              <span className="small fw-semibold">{fu.customer.name}</span>
                            </div>
                          )}
                          {fu.opportunity && (
                            <div>
                              <span className="badge bg-light text-success border me-1">Deal</span>
                              <span className="small">{fu.opportunity.name}</span>
                            </div>
                          )}
                          {fu.lead && (
                            <div>
                              <span className="badge bg-light text-info border me-1">Lead</span>
                              <span className="small">{fu.lead.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="small">
                          {fu.scheduledDate
                            ? new Date(fu.scheduledDate).toLocaleString([], {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : '—'}
                        </td>
                        <td>{getStatusBadge(fu.status)}</td>
                        <td>
                          {fu.assignedTo ? (
                            <div>
                              <span className="small fw-semibold">{fu.assignedTo.name}</span>
                              <span className="badge bg-light text-dark border ms-1 small">
                                {fu.assignedTo.role}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted small">—</span>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            {isPending && (
                              <button
                                className="btn btn-outline-success btn-sm"
                                onClick={() => handleQuickStatusChange(fu, 'Completed')}
                                title="Mark Activity as Completed"
                              >
                                ✓ Complete
                              </button>
                            )}

                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => openEditModal(fu)}
                            >
                              Edit
                            </button>

                            {(isAdmin || isManager) && (
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleDeleteFollowUp(fu)}
                                title="Delete Activity"
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Schedule New Activity</h5>
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
                    <div className="col-12 col-md-8">
                      <label className="form-label small fw-semibold">Activity Subject *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Product Demo Call with Operations Lead"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Activity Type *</label>
                      <select
                        className="form-select"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="Call">Call</option>
                        <option value="Email">Email</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Visit">Site Visit</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Scheduled Date & Time *</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Initial Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    {/* Associated Records */}
                    <div className="col-12">
                      <div className="p-3 bg-light rounded border">
                        <label className="form-label small fw-bold text-uppercase mb-2 text-primary">
                          🔗 Link to Entity (Select at least one)
                        </label>
                        <div className="row g-2">
                          <div className="col-12 col-md-4">
                            <label className="form-label small">Related Customer</label>
                            <select
                              className="form-select form-select-sm"
                              value={formData.customer}
                              onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                            >
                              <option value="">None</option>
                              {customersList.map((c) => (
                                <option key={c._id} value={c._id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-12 col-md-4">
                            <label className="form-label small">Related Opportunity</label>
                            <select
                              className="form-select form-select-sm"
                              value={formData.opportunity}
                              onChange={(e) => setFormData({ ...formData, opportunity: e.target.value })}
                            >
                              <option value="">None</option>
                              {opportunitiesList.map((o) => (
                                <option key={o._id} value={o._id}>
                                  {o.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-12 col-md-4">
                            <label className="form-label small">Related Lead</label>
                            <select
                              className="form-select form-select-sm"
                              value={formData.lead}
                              onChange={(e) => setFormData({ ...formData, lead: e.target.value })}
                            >
                              <option value="">None</option>
                              {leadsList.map((l) => (
                                <option key={l._id} value={l._id}>
                                  {l.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(isAdmin || isManager) && (
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold">Assign Executive</label>
                        <select
                          className="form-select"
                          value={formData.assignedTo}
                          onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                        >
                          <option value="">Assign to Me / Unassigned</option>
                          {usersList.map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name} ({u.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Activity Notes</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Discussion agenda, next steps, feedback..."
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
                    {actionLoading ? 'Scheduling...' : 'Save Activity'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedFollowUp && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Update Activity: {selectedFollowUp.subject}</h5>
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
                    <div className="col-12 col-md-8">
                      <label className="form-label small fw-semibold">Activity Subject *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Type</label>
                      <select
                        className="form-select"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="Call">Call</option>
                        <option value="Email">Email</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Visit">Site Visit</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Status</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Scheduled Date & Time</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      />
                    </div>
                    {(isAdmin || isManager) ? (
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold">Reassign Executive</label>
                        <select
                          className="form-select"
                          value={formData.assignedTo}
                          onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                        >
                          {usersList.map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name} ({u.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold">Assigned Executive</label>
                        <input
                          type="text"
                          className="form-control"
                          value={user?.name}
                          disabled
                        />
                        <small className="text-muted">Sales Executives cannot reassign activities.</small>
                      </div>
                    )}
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Outcome / Notes</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Meeting minutes, client commitments, next action points..."
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

export default FollowUpListPage;
