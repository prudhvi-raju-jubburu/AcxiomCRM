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
 * Schedules and tracks client interactions (Call, Email, Meeting, Visit, Other)
 * linked to Customers, Leads, and Opportunities with a unified Add/Edit modal.
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

  // Modal & Form state (unified for Add and Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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

  // Fetch follow-ups from backend API
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

  // Open modal for creating a new follow-up
  const handleOpenAdd = () => {
    setEditingFollowUp(null);
    setFormData(initialForm);
    setError('');
    setShowModal(true);
  };

  // Open modal for editing an existing follow-up
  const handleOpenEdit = (fu) => {
    setEditingFollowUp(fu);
    setFormData({
      subject: fu.subject || '',
      type: fu.type || 'Call',
      customer: fu.customer?._id || fu.customer || '',
      lead: fu.lead?._id || fu.lead || '',
      opportunity: fu.opportunity?._id || fu.opportunity || '',
      assignedTo: fu.assignedTo?._id || fu.assignedTo || '',
      scheduledDate: fu.scheduledDate ? fu.scheduledDate.substring(0, 16) : '',
      status: fu.status || 'Pending',
      description: fu.description || '',
      notes: fu.notes || '',
    });
    setError('');
    setShowModal(true);
  };

  // Handle Form Submit (both Create and Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!formData.scheduledDate) {
      setError('Scheduled date is required.');
      return;
    }
    if (!formData.customer && !formData.lead && !formData.opportunity) {
      setError('Please associate this follow-up with at least one record (Customer, Lead, or Opportunity).');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');

      const payload = { ...formData };
      if (!payload.customer) delete payload.customer;
      if (!payload.lead) delete payload.lead;
      if (!payload.opportunity) delete payload.opportunity;

      // Sales Executive cannot reassign
      if (isSalesExecutive) {
        delete payload.assignedTo;
      } else if (!payload.assignedTo) {
        delete payload.assignedTo;
      }

      if (editingFollowUp) {
        await updateFollowUpApi(editingFollowUp._id, payload);
        setSuccessMsg(`Follow-up activity "${formData.subject}" updated successfully.`);
      } else {
        await createFollowUpApi(payload);
        setSuccessMsg(`Follow-up activity "${formData.subject}" scheduled successfully.`);
      }

      setShowModal(false);
      setEditingFollowUp(null);
      setFormData(initialForm);
      fetchFollowUps();
    } catch (err) {
      setError(err.message || 'Failed to save follow-up activity.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Follow-Up (Admin & Manager only)
  const handleDeleteFollowUp = async (fu) => {
    if (!window.confirm(`Are you sure you want to delete follow-up "${fu.subject}"?`)) {
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      await deleteFollowUpApi(fu._id);
      setSuccessMsg(`Follow-up "${fu.subject}" deleted successfully.`);
      fetchFollowUps();
    } catch (err) {
      setError(err.message || 'Failed to delete follow-up.');
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <span className="badge bg-success">Completed</span>;
      case 'Cancelled':
        return <span className="badge bg-secondary">Cancelled</span>;
      default:
        return <span className="badge bg-warning text-dark">Pending</span>;
    }
  };

  // Type icon helper
  const getTypeBadge = (type) => {
    switch (type) {
      case 'Call':
        return <span className="badge bg-info text-dark">📞 Call</span>;
      case 'Email':
        return <span className="badge bg-primary">✉️ Email</span>;
      case 'Meeting':
        return <span className="badge bg-success">🤝 Meeting</span>;
      case 'Visit':
        return <span className="badge bg-danger">🚗 Visit</span>;
      default:
        return <span className="badge bg-secondary">📝 Other</span>;
    }
  };

  return (
    <div className="followup-list-page">
      {/* Page Header */}
      <div className="crm-page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h2 className="crm-page-title">Follow-Ups &amp; Activities</h2>
          <p className="crm-page-subtitle">Schedule and review client calls, meetings, and milestone tasks</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenAdd}>
          <span>+</span> Schedule Activity
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
            <div className="col-6 col-md-5">
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-6 col-md-5">
              <select
                className="form-select form-select-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Activity Types</option>
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

      {/* Follow-Ups Table */}
      <div className="card crm-card">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fw-bold">Scheduled Activities ({followUps.length})</h5>
          <span className="badge bg-light text-dark border">
            {isSalesExecutive ? 'My Activities' : 'Team Activities'}
          </span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted small">Loading activity tasks...</p>
            </div>
          ) : followUps.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <span className="fs-1 d-block mb-2">📅</span>
              <p className="mb-0">No follow-up activities found matching your criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Activity</th>
                    <th>Linked Record</th>
                    <th>Scheduled Date</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {followUps.map((fu) => (
                    <tr key={fu._id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {getTypeBadge(fu.type)}
                          <span className="fw-bold">{fu.subject}</span>
                        </div>
                        {fu.description && (
                          <div className="small text-muted text-truncate mt-1" style={{ maxWidth: '300px' }}>
                            {fu.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {fu.customer && (
                          <div>
                            <span className="badge bg-light text-primary border me-1">Customer</span>
                            <span className="small fw-semibold">{fu.customer.name}</span>
                          </div>
                        )}
                        {fu.lead && (
                          <div>
                            <span className="badge bg-light text-warning border me-1">Lead</span>
                            <span className="small fw-semibold">{fu.lead.name}</span>
                          </div>
                        )}
                        {fu.opportunity && (
                          <div>
                            <span className="badge bg-light text-success border me-1">Deal</span>
                            <span className="small fw-semibold">{fu.opportunity.name}</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="small">
                          {fu.scheduledDate ? new Date(fu.scheduledDate).toLocaleString() : '—'}
                        </span>
                      </td>
                      <td>{getStatusBadge(fu.status)}</td>
                      <td>
                        {fu.assignedTo ? (
                          <span className="small fw-semibold">{fu.assignedTo.name}</span>
                        ) : (
                          <span className="text-muted small">Unassigned</span>
                        )}
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-outline-primary btn-sm me-2"
                          onClick={() => handleOpenEdit(fu)}
                        >
                          Edit
                        </button>
                        {(isAdmin || isManager) && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeleteFollowUp(fu)}
                            title="Delete activity"
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
                  {editingFollowUp ? `Edit Activity: ${editingFollowUp.subject}` : 'Schedule New Activity'}
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
                    <div className="col-12 col-md-8">
                      <label className="form-label small fw-semibold">Subject / Title *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Product Demo Review with Fleet Managers"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Activity Type</label>
                      <select
                        className="form-select"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="Call">Call</option>
                        <option value="Email">Email</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Visit">Visit</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Scheduled Date &amp; Time *</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                        required
                      />
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

                    {/* Associated Records */}
                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Linked Customer</label>
                      <select
                        className="form-select"
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
                      <label className="form-label small fw-semibold">Linked Lead</label>
                      <select
                        className="form-select"
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

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Linked Opportunity</label>
                      <select
                        className="form-select"
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

                    {(isAdmin || isManager) && (
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold">Assign Sales Rep</label>
                        <select
                          className="form-select"
                          value={formData.assignedTo}
                          onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                        >
                          <option value="">Assign to Me / Default</option>
                          {usersList.map((u) => (
                            <option key={u._id} value={u._id}>
                              {u.name} ({u.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Agenda / Description</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Agenda, discussion topics, or location details..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      ></textarea>
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Outcome / Notes (Optional)</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Meeting minutes, client feedback, or outcome summary..."
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
                      : editingFollowUp
                      ? 'Update Activity'
                      : 'Schedule Activity'}
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
