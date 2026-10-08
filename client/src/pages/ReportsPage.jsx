import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getCustomerReportApi,
  getLeadReportApi,
  getFollowUpReportApi,
  getOpportunityReportApi,
  getPipelineReportApi,
  getConversionReportApi,
  getUserPerformanceReportApi,
} from '../services/api';

const ReportsPage = () => {
  const { user, isAdmin, isManager } = useAuth();
  const canViewPerformance = isAdmin || isManager;

  const [activeTab, setActiveTab] = useState('pipeline');
  const [period, setPeriod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Report data states
  const [pipelineData, setPipelineData] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [leadData, setLeadData] = useState(null);
  const [conversionData, setConversionData] = useState(null);
  const [oppData, setOppData] = useState(null);
  const [followUpData, setFollowUpData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);

  const getQueryParams = () => {
    const params = {};
    if (period) {
      params.period = period;
    } else {
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
    }
    return params;
  };

  const loadCurrentReport = async () => {
    setLoading(true);
    setError('');
    const params = getQueryParams();

    try {
      if (activeTab === 'pipeline') {
        const res = await getPipelineReportApi(params);
        if (res.success) setPipelineData(res.data);
      } else if (activeTab === 'customers') {
        const res = await getCustomerReportApi(params);
        if (res.success) setCustomerData(res.data);
      } else if (activeTab === 'leads') {
        const [lRes, cRes] = await Promise.all([
          getLeadReportApi(params),
          getConversionReportApi(params),
        ]);
        if (lRes.success) setLeadData(lRes.data);
        if (cRes.success) setConversionData(cRes.data);
      } else if (activeTab === 'opportunities') {
        const res = await getOpportunityReportApi(params);
        if (res.success) setOppData(res.data);
      } else if (activeTab === 'followups') {
        const res = await getFollowUpReportApi(params);
        if (res.success) setFollowUpData(res.data);
      } else if (activeTab === 'performance' && canViewPerformance) {
        const res = await getUserPerformanceReportApi(params);
        if (res.success) setPerformanceData(res.data);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
      setError(err.response?.data?.message || 'Failed to generate report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentReport();
  }, [activeTab]);

  const handleApplyFilter = (e) => {
    e.preventDefault();
    loadCurrentReport();
  };

  const handleResetFilter = () => {
    setPeriod('');
    setStartDate('');
    setEndDate('');
    setTimeout(() => {
      loadCurrentReport();
    }, 0);
  };

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStageBadgeClass = (stage) => {
    switch (stage) {
      case 'Closed Won':
        return 'bg-success';
      case 'Closed Lost':
        return 'bg-secondary';
      case 'Negotiation':
        return 'bg-info text-dark';
      case 'Proposal':
        return 'bg-primary';
      case 'Qualification':
        return 'bg-warning text-dark';
      default:
        return 'bg-light text-dark border';
    }
  };

  return (
    <div className="reports-page pb-5">
      {/* Title Header */}
      <div className="crm-page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className="badge bg-secondary">{user?.role}</span>
            <span className="small text-muted">Role-based analytics</span>
          </div>
          <h2 className="crm-page-title">Reports</h2>
          <p className="crm-page-subtitle">
            Cross-entity reporting with role-based aggregation and date range filtering.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="crm-filter-bar">
        <form onSubmit={handleApplyFilter} className="row g-3 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label small fw-semibold text-muted mb-1">Time Preset</label>
              <select
                className="form-select form-select-sm"
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  if (e.target.value) {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
              >
                <option value="">All Time (Custom Dates)</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
              </select>
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label small fw-semibold text-muted mb-1">From Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={startDate}
                disabled={Boolean(period)}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label small fw-semibold text-muted mb-1">To Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={endDate}
                disabled={Boolean(period)}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-3 d-flex gap-2">
              <button type="submit" className="btn btn-primary btn-sm flex-grow-1 fw-semibold">
                Apply Filter
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={handleResetFilter}
              >
                Reset
              </button>
            </div>
          </form>
        </div>

      {/* Nav Tabs */}
      <ul className="nav nav-pills mb-4 bg-white p-2 rounded-3 border shadow-sm">
        <li className="nav-item">
          <button
            className={`nav-link btn-sm fw-semibold ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            📈 Sales Pipeline
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link btn-sm fw-semibold ${activeTab === 'leads' ? 'active' : ''}`}
            onClick={() => setActiveTab('leads')}
          >
            🎯 Leads & Conversion
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link btn-sm fw-semibold ${activeTab === 'opportunities' ? 'active' : ''}`}
            onClick={() => setActiveTab('opportunities')}
          >
            💼 Opportunities
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link btn-sm fw-semibold ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            🏢 Customers
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link btn-sm fw-semibold ${activeTab === 'followups' ? 'active' : ''}`}
            onClick={() => setActiveTab('followups')}
          >
            📅 Follow-Ups
          </button>
        </li>
        {canViewPerformance && (
          <li className="nav-item">
            <button
              className={`nav-link btn-sm fw-semibold ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              👥 Team Performance
            </button>
          </li>
        )}
      </ul>

      {/* Loading & Error States */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span className="text-muted">Loading report data...</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <div>
            <strong>Report Error:</strong> {error}
          </div>
          <button className="btn btn-sm btn-outline-danger" onClick={loadCurrentReport}>
            Retry
          </button>
        </div>
      )}

      {/* TAB CONTENT */}
      {!loading && !error && (
        <div>
          {/* 1. SALES PIPELINE REPORT */}
          {activeTab === 'pipeline' && pipelineData && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-4">
                  <div className="card shadow-sm border-0 border-start border-primary border-4 p-3 bg-white">
                    <div className="text-muted small text-uppercase fw-semibold">
                      Active Pipeline Value
                    </div>
                    <h3 className="fw-bold text-primary mb-0 mt-1">
                      {formatCurrency(pipelineData.pipelineValue)}
                    </h3>
                    <div className="small text-muted mt-1">
                      {pipelineData.activeOpportunities} Active deals in progress
                    </div>
                  </div>
                </div>

                <div className="col-12 col-sm-4">
                  <div className="card shadow-sm border-0 border-start border-success border-4 p-3 bg-white">
                    <div className="text-muted small text-uppercase fw-semibold">
                      Closed Won Value
                    </div>
                    <h3 className="fw-bold text-success mb-0 mt-1">
                      {formatCurrency(pipelineData.wonValue)}
                    </h3>
                    <div className="small text-muted mt-1">Total revenue closed</div>
                  </div>
                </div>

                <div className="col-12 col-sm-4">
                  <div className="card shadow-sm border-0 border-start border-secondary border-4 p-3 bg-white">
                    <div className="text-muted small text-uppercase fw-semibold">
                      Total Pipeline Volume
                    </div>
                    <h3 className="fw-bold text-dark mb-0 mt-1">
                      {pipelineData.totalOpportunities} Deals
                    </h3>
                    <div className="small text-muted mt-1">
                      Overall Value: {formatCurrency(pipelineData.overallTotalValue)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card shadow-sm border-0 bg-white">
                <div className="card-header bg-white py-3 border-bottom">
                  <h5 className="card-title mb-0 fw-bold fs-6">Pipeline Stage Breakdown</h5>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Stage</th>
                        <th>Deals Count</th>
                        <th>Total Value (₹)</th>
                        <th>Avg. Probability</th>
                        <th>% of Total Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pipelineData.stages.map((st) => (
                        <tr key={st.stage}>
                          <td>
                            <span className={`badge ${getStageBadgeClass(st.stage)}`}>
                              {st.stage}
                            </span>
                          </td>
                          <td className="fw-bold">{st.count}</td>
                          <td className="fw-semibold">{formatCurrency(st.totalAmount)}</td>
                          <td>{st.avgProbability}%</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: '6px' }}>
                                <div
                                  className="progress-bar bg-primary"
                                  style={{ width: `${st.percentageOfTotal}%` }}
                                ></div>
                              </div>
                              <span className="small text-muted">{st.percentageOfTotal}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. LEADS & CONVERSION REPORT */}
          {activeTab === 'leads' && leadData && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-6 col-lg-3">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">Total Leads</div>
                    <h3 className="fw-bold text-dark mb-0 mt-1">{leadData.summary.total}</h3>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">Converted Leads</div>
                    <h3 className="fw-bold text-success mb-0 mt-1">
                      {leadData.summary.byStatus.Converted}
                    </h3>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">Qualified Leads</div>
                    <h3 className="fw-bold text-warning mb-0 mt-1">
                      {leadData.summary.byStatus.Qualified}
                    </h3>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">Lead Win Rate</div>
                    <h3 className="fw-bold text-primary mb-0 mt-1">
                      {leadData.summary.conversionRate}%
                    </h3>
                  </div>
                </div>
              </div>

              {/* Conversion by Source Table */}
              {conversionData?.sources && conversionData.sources.length > 0 && (
                <div className="card shadow-sm border-0 bg-white mb-4">
                  <div className="card-header bg-white py-3 border-bottom">
                    <h5 className="card-title mb-0 fw-bold fs-6">Lead Conversion by Marketing Source</h5>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Acquisition Source</th>
                          <th>Total Leads</th>
                          <th>Converted Leads</th>
                          <th>Conversion Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversionData.sources.map((s) => (
                          <tr key={s.source}>
                            <td className="fw-semibold">{s.source}</td>
                            <td>{s.total}</td>
                            <td className="text-success fw-bold">{s.converted}</td>
                            <td>
                              <span className="badge bg-primary">{s.conversionRate}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Leads List */}
              <div className="card shadow-sm border-0 bg-white">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0 fw-bold fs-6">Lead Records</h5>
                  <span className="badge bg-light text-muted border">
                    {leadData.leads.length} Records
                  </span>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Lead Name</th>
                        <th>Company</th>
                        <th>Source</th>
                        <th>Status</th>
                        <th>Assigned Executive</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadData.leads.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-muted">
                            No lead records matching filter.
                          </td>
                        </tr>
                      ) : (
                        leadData.leads.map((l) => (
                          <tr key={l._id}>
                            <td className="fw-semibold">{l.name}</td>
                            <td>{l.company || '—'}</td>
                            <td>
                              <span className="badge bg-light text-dark border">{l.source}</span>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  l.status === 'Converted'
                                    ? 'bg-success'
                                    : l.status === 'Lost'
                                    ? 'bg-danger'
                                    : l.status === 'Qualified'
                                    ? 'bg-warning text-dark'
                                    : 'bg-primary'
                                }`}
                              >
                                {l.status}
                              </span>
                            </td>
                            <td>{l.assignedTo?.name || 'Unassigned'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. OPPORTUNITIES REPORT */}
          {activeTab === 'opportunities' && oppData && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-3">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">Total Deals</div>
                    <h3 className="fw-bold text-dark mb-0 mt-1">{oppData.summary.total}</h3>
                  </div>
                </div>
                <div className="col-12 col-sm-3">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">Open Deals</div>
                    <h3 className="fw-bold text-primary mb-0 mt-1">{oppData.summary.open}</h3>
                  </div>
                </div>
                <div className="col-12 col-sm-3">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">
                      Open Pipeline Value
                    </div>
                    <h3 className="fw-bold text-primary mb-0 mt-1">
                      {formatCurrency(oppData.summary.pipelineAmount)}
                    </h3>
                  </div>
                </div>
                <div className="col-12 col-sm-3">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">Won Revenue</div>
                    <h3 className="fw-bold text-success mb-0 mt-1">
                      {formatCurrency(oppData.summary.wonAmount)}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="card shadow-sm border-0 bg-white">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0 fw-bold fs-6">Opportunity Deals</h5>
                  <span className="badge bg-light text-muted border">
                    {oppData.opportunities.length} Records
                  </span>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Deal Name</th>
                        <th>Customer</th>
                        <th>Deal Amount</th>
                        <th>Stage</th>
                        <th>Win Prob.</th>
                        <th>Target Close</th>
                        <th>Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oppData.opportunities.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4 text-muted">
                            No opportunity records matching filter.
                          </td>
                        </tr>
                      ) : (
                        oppData.opportunities.map((o) => (
                          <tr key={o._id}>
                            <td className="fw-semibold">{o.name}</td>
                            <td>{o.customer?.name || '—'}</td>
                            <td className="fw-bold text-dark">{formatCurrency(o.amount)}</td>
                            <td>
                              <span className={`badge ${getStageBadgeClass(o.stage)}`}>
                                {o.stage}
                              </span>
                            </td>
                            <td>{o.probability}%</td>
                            <td>{new Date(o.expectedCloseDate).toLocaleDateString()}</td>
                            <td>{o.assignedTo?.name || 'Unassigned'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. CUSTOMERS REPORT */}
          {activeTab === 'customers' && customerData && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-4">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">Total Customers</div>
                    <h3 className="fw-bold text-dark mb-0 mt-1">{customerData.summary.total}</h3>
                  </div>
                </div>
                <div className="col-12 col-sm-4">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">Active Customers</div>
                    <h3 className="fw-bold text-success mb-0 mt-1">{customerData.summary.active}</h3>
                  </div>
                </div>
                <div className="col-12 col-sm-4">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">Inactive Accounts</div>
                    <h3 className="fw-bold text-secondary mb-0 mt-1">
                      {customerData.summary.inactive}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="card shadow-sm border-0 bg-white">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0 fw-bold fs-6">Customer Accounts</h5>
                  <span className="badge bg-light text-muted border">
                    {customerData.customers.length} Records
                  </span>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Customer Name</th>
                        <th>Company</th>
                        <th>Acquisition Source</th>
                        <th>Status</th>
                        <th>Assigned Executive</th>
                        <th>Date Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerData.customers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4 text-muted">
                            No customers found matching filter.
                          </td>
                        </tr>
                      ) : (
                        customerData.customers.map((c) => (
                          <tr key={c._id}>
                            <td className="fw-semibold">{c.name}</td>
                            <td>{c.company || '—'}</td>
                            <td>
                              <span className="badge bg-light text-dark border">{c.source}</span>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  c.status === 'Active' ? 'bg-success' : 'bg-secondary'
                                }`}
                              >
                                {c.status}
                              </span>
                            </td>
                            <td>{c.assignedTo?.name || 'Unassigned'}</td>
                            <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. FOLLOW-UPS REPORT */}
          {activeTab === 'followups' && followUpData && (
            <div>
              <div className="row g-3 mb-4">
                <div className="col-12 col-sm-3">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">
                      Total Activities
                    </div>
                    <h3 className="fw-bold text-dark mb-0 mt-1">{followUpData.summary.total}</h3>
                  </div>
                </div>
                <div className="col-12 col-sm-3">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">
                      Pending Tasks
                    </div>
                    <h3 className="fw-bold text-warning mb-0 mt-1">
                      {followUpData.summary.pending}
                    </h3>
                  </div>
                </div>
                <div className="col-12 col-sm-3">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">
                      Completed Tasks
                    </div>
                    <h3 className="fw-bold text-success mb-0 mt-1">
                      {followUpData.summary.completed}
                    </h3>
                  </div>
                </div>
                <div className="col-12 col-sm-3">
                  <div className="card shadow-sm border-0 p-3 bg-white text-center">
                    <div className="text-muted small text-uppercase fw-semibold">
                      Cancelled
                    </div>
                    <h3 className="fw-bold text-secondary mb-0 mt-1">
                      {followUpData.summary.cancelled}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="card shadow-sm border-0 bg-white">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0 fw-bold fs-6">Scheduled Activities</h5>
                  <span className="badge bg-light text-muted border">
                    {followUpData.followUps.length} Records
                  </span>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Subject</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Scheduled Date</th>
                        <th>Related Record</th>
                        <th>Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {followUpData.followUps.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4 text-muted">
                            No follow-up activities matching filter.
                          </td>
                        </tr>
                      ) : (
                        followUpData.followUps.map((f) => (
                          <tr key={f._id}>
                            <td className="fw-semibold">{f.subject}</td>
                            <td>
                              <span className="badge bg-light text-dark border">{f.type}</span>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  f.status === 'Completed'
                                    ? 'bg-success'
                                    : f.status === 'Pending'
                                    ? 'bg-warning text-dark'
                                    : 'bg-secondary'
                                }`}
                              >
                                {f.status}
                              </span>
                            </td>
                            <td>{new Date(f.scheduledDate).toLocaleString()}</td>
                            <td>
                              {f.customer?.name || f.lead?.name || f.opportunity?.name || '—'}
                            </td>
                            <td>{f.assignedTo?.name || 'Unassigned'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. TEAM PERFORMANCE REPORT (Admin & Manager only) */}
          {activeTab === 'performance' && canViewPerformance && performanceData && (
            <div>
              <div className="card shadow-sm border-0 bg-white">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="card-title mb-0 fw-bold fs-6">Sales Team Activity & Pipeline Performance</h5>
                    <p className="text-muted small mb-0">
                      Cross-executive summary of deal conversion and activity metrics.
                    </p>
                  </div>
                  <span className="badge bg-primary">
                    {performanceData.totalExecutives} Sales Executives
                  </span>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Sales Executive</th>
                        <th>Assigned Leads</th>
                        <th>Converted</th>
                        <th>Win Rate</th>
                        <th>Total Deals</th>
                        <th>Won Deals</th>
                        <th>Pipeline Amount</th>
                        <th>Won Revenue</th>
                        <th>Follow-Ups (Pending/Done)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceData.executives.length === 0 ? (
                        <tr>
                          <td colSpan="9" className="text-center py-4 text-muted">
                            No sales executives found.
                          </td>
                        </tr>
                      ) : (
                        performanceData.executives.map((ex) => (
                          <tr key={ex.user.id}>
                            <td>
                              <div className="fw-bold">{ex.user.name}</div>
                              <div className="small text-muted">{ex.user.email}</div>
                            </td>
                            <td>{ex.assignedLeads}</td>
                            <td className="text-success fw-semibold">{ex.convertedLeads}</td>
                            <td>
                              <span className="badge bg-info text-dark">{ex.conversionRate}%</span>
                            </td>
                            <td>{ex.assignedOpportunities}</td>
                            <td className="text-success fw-bold">{ex.wonOpportunities}</td>
                            <td className="fw-semibold text-primary">
                              {formatCurrency(ex.pipelineAmount)}
                            </td>
                            <td className="fw-bold text-success">
                              {formatCurrency(ex.wonAmount)}
                            </td>
                            <td>
                              <span className="badge bg-warning text-dark me-1">
                                {ex.pendingFollowUps} P
                              </span>
                              <span className="badge bg-success">{ex.completedFollowUps} C</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
