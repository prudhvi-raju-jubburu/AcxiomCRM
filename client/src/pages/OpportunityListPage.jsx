import React, { useState, useEffect, useCallback } from 'react';
import {
  getOpportunitiesApi,
  createOpportunityApi,
  updateOpportunityApi,
  deleteOpportunityApi,
  getCustomersApi,
  getLeadsApi,
  getUsersApi,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Opportunity List Page
 * Sales pipeline deal tracking across lifecycle stages with probability calibration.
 */
const OpportunityListPage = () => {
  const { user, isAdmin, isManager, isSalesExecutive } = useAuth();

  const [opportunities, setOpportunities] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');

  // Modal & Form state (unified for Add and Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const initialForm = {
    name: '',
    customer: '',
    lead: '',
    assignedTo: '',
    amount: '',
    probability: 20,
    expectedCloseDate: '',
    stage: 'Prospecting',
    description: '',
  };
  const [formData, setFormData] = useState(initialForm);

  // Format amount to Indian Rupee (₹)
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  // Fetch opportunities from backend API
  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (stageFilter) params.stage = stageFilter;

      const res = await getOpportunitiesApi(params);
      setOpportunities(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load opportunities.');
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter]);

  // Load supporting entities (Customers, Leads, and Users)
  useEffect(() => {
    getCustomersApi()
      .then((res) => setCustomersList(res.data || []))
      .catch(() => setCustomersList([]));

    getLeadsApi()
      .then((res) => setLeadsList(res.data || []))
      .catch(() => setLeadsList([]));

    if (isAdmin || isManager) {
      getUsersApi({ isActive: true })
        .then((res) => setUsersList(res.data || []))
        .catch(() => setUsersList([]));
    }
  }, [isAdmin, isManager]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Stage change handler that automatically calibrates win probability
  const handleStageChange = (newStage) => {
    let newProb = formData.probability;
    if (newStage === 'Closed Won') newProb = 100;
    else if (newStage === 'Closed Lost') newProb = 0;
    else if (newStage === 'Prospecting' && (!formData.probability || formData.probability === 0)) newProb = 20;

    setFormData({ ...formData, stage: newStage, probability: newProb });
  };

  // Open modal for creating a new opportunity
  const handleOpenAdd = () => {
    setEditingOpp(null);
    setFormData(initialForm);
    setError('');
    setShowModal(true);
  };

  // Open modal for editing an existing opportunity
  const handleOpenEdit = (opp) => {
    setEditingOpp(opp);
    setFormData({
      name: opp.name || '',
      customer: opp.customer?._id || opp.customer || '',
      lead: opp.lead?._id || opp.lead || '',
      assignedTo: opp.assignedTo?._id || opp.assignedTo || '',
      amount: opp.amount || '',
      probability: opp.probability !== undefined ? opp.probability : 20,
      expectedCloseDate: opp.expectedCloseDate ? opp.expectedCloseDate.substring(0, 10) : '',
      stage: opp.stage || 'Prospecting',
      description: opp.description || '',
    });
    setError('');
    setShowModal(true);
  };

  // Handle Form Submit (both Create and Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Opportunity name is required.');
      return;
    }
    if (!formData.customer) {
      setError('Please select an associated customer.');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      setError('Deal amount must be greater than 0.');
      return;
    }
    if (!formData.expectedCloseDate) {
      setError('Expected close date is required.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');

      const payload = {
        ...formData,
        amount: Number(formData.amount),
        probability: Number(formData.probability),
      };

      if (!payload.lead) delete payload.lead;

      // Sales Executive cannot reassign
      if (isSalesExecutive) {
        delete payload.assignedTo;
      } else if (!payload.assignedTo) {
        delete payload.assignedTo;
      }

      if (editingOpp) {
        await updateOpportunityApi(editingOpp._id, payload);
        setSuccessMsg(`Opportunity "${formData.name}" updated successfully.`);
      } else {
        await createOpportunityApi(payload);
        setSuccessMsg(`Opportunity "${formData.name}" created successfully.`);
      }

      setShowModal(false);
      setEditingOpp(null);
      setFormData(initialForm);
      fetchOpportunities();
    } catch (err) {
      setError(err.message || 'Failed to save opportunity.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Opportunity (Admin & Manager only)
  const handleDeleteOpp = async (opp) => {
    if (!window.confirm(`Are you sure you want to delete opportunity "${opp.name}"?`)) {
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      await deleteOpportunityApi(opp._id);
      setSuccessMsg(`Opportunity "${opp.name}" deleted successfully.`);
      fetchOpportunities();
    } catch (err) {
      setError(err.message || 'Failed to delete opportunity.');
    }
  };

  // Stage badge styling helper
  const getStageBadge = (stage) => {
    switch (stage) {
      case 'Closed Won':
        return <span className="badge bg-success">Closed Won</span>;
      case 'Closed Lost':
        return <span className="badge bg-danger">Closed Lost</span>;
      case 'Negotiation':
        return <span className="badge bg-warning text-dark">Negotiation</span>;
      case 'Proposal':
        return <span className="badge bg-info text-dark">Proposal</span>;
      case 'Qualification':
        return <span className="badge bg-primary">Qualification</span>;
      default:
        return <span className="badge bg-secondary">Prospecting</span>;
    }
  };

  return (
    <div className="opportunity-list-page">
      {/* Page Header */}
      <div className="crm-page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h2 className="crm-page-title">Opportunities</h2>
          <p className="crm-page-subtitle">Track sales deals, pipeline stages, and win probabilities</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenAdd}>
          <span>+</span> Add Opportunity
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
                placeholder="Search deals by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-6 col-md-3">
              <select
                className="form-select form-select-sm"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
              >
                <option value="">All Stages</option>
                <option value="Prospecting">Prospecting</option>
                <option value="Qualification">Qualification</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Closed Won">Closed Won</option>
                <option value="Closed Lost">Closed Lost</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <button
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={() => {
                  setSearch('');
                  setStageFilter('');
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="card crm-card">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 fw-bold">Pipeline Deals ({opportunities.length})</h5>
          <span className="badge bg-light text-dark border">
            {isSalesExecutive ? 'My Pipeline' : 'Team Pipeline'}
          </span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted small">Loading sales opportunities...</p>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <span className="fs-1 d-block mb-2">💼</span>
              <p className="mb-0">No opportunities found matching your criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Deal Name</th>
                    <th>Customer</th>
                    <th>Stage</th>
                    <th>Deal Value</th>
                    <th>Probability</th>
                    <th>Expected Close</th>
                    <th>Assigned Rep</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((opp) => (
                    <tr key={opp._id}>
                      <td>
                        <strong>{opp.name}</strong>
                      </td>
                      <td>
                        {opp.customer ? (
                          <div>
                            <span className="fw-semibold small">{opp.customer.name}</span>
                            {opp.customer.company && (
                              <div className="small text-muted">{opp.customer.company}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                      <td>{getStageBadge(opp.stage)}</td>
                      <td>
                        <span className="fw-bold text-dark">{formatCurrency(opp.amount)}</span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-grow-1" style={{ height: '6px', width: '50px' }}>
                            <div
                              className={`progress-bar ${
                                opp.probability >= 70
                                  ? 'bg-success'
                                  : opp.probability >= 40
                                  ? 'bg-primary'
                                  : 'bg-warning'
                              }`}
                              style={{ width: `${opp.probability}%` }}
                            ></div>
                          </div>
                          <span className="small fw-semibold">{opp.probability}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="small text-muted">
                          {opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td>
                        {opp.assignedTo ? (
                          <span className="small fw-semibold">{opp.assignedTo.name}</span>
                        ) : (
                          <span className="text-muted small">Unassigned</span>
                        )}
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-outline-primary btn-sm me-2"
                          onClick={() => handleOpenEdit(opp)}
                        >
                          Edit
                        </button>
                        {(isAdmin || isManager) && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeleteOpp(opp)}
                            title="Delete opportunity"
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
                  {editingOpp ? `Edit Opportunity: ${editingOpp.name}` : 'Add New Opportunity'}
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
                      <label className="form-label small fw-semibold">Opportunity Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. POS Cloud Upgrade"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Customer Account *</label>
                      <select
                        className="form-select"
                        value={formData.customer}
                        onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                        required
                      >
                        <option value="">Select Customer...</option>
                        {customersList.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} {c.company ? `(${c.company})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Deal Amount (₹) *</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder="e.g. 150000"
                        min="1"
                        step="any"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Sales Stage</label>
                      <select
                        className="form-select"
                        value={formData.stage}
                        onChange={(e) => handleStageChange(e.target.value)}
                      >
                        <option value="Prospecting">Prospecting</option>
                        <option value="Qualification">Qualification</option>
                        <option value="Proposal">Proposal</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Closed Won">Closed Won</option>
                        <option value="Closed Lost">Closed Lost</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label small fw-semibold">Win Probability (%)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        max="100"
                        value={formData.probability}
                        onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                        disabled={formData.stage === 'Closed Won' || formData.stage === 'Closed Lost'}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Expected Close Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.expectedCloseDate}
                        onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Originating Lead (Optional)</label>
                      <select
                        className="form-select"
                        value={formData.lead}
                        onChange={(e) => setFormData({ ...formData, lead: e.target.value })}
                      >
                        <option value="">None (Direct Customer)</option>
                        {leadsList.map((l) => (
                          <option key={l._id} value={l._id}>
                            {l.name} {l.company ? `(${l.company})` : ''}
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
                      <label className="form-label small fw-semibold">Description / Scope Notes</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Deal scope, milestones, or discussion summary..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                      : editingOpp
                      ? 'Update Opportunity'
                      : 'Create Opportunity'}
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

export default OpportunityListPage;
