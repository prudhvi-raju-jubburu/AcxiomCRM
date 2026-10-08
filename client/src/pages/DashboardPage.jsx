import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardSummaryApi } from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const DashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getDashboardSummaryApi();
      if (response.success) {
        setData(response.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
      setError(
        err.response?.data?.message || 'Failed to load dashboard data. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
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

  if (loading) {
    return (
      <div className="crm-loading-container">
        <div className="spinner-border text-primary" role="status"></div>
        <span className="crm-loading-text">Loading CRM dashboard metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4 d-flex justify-content-between align-items-center">
        <div>
          <h6 className="alert-heading mb-1 fw-bold">Unable to Load Dashboard</h6>
          <p className="mb-0 small">{error}</p>
        </div>
        <button className="btn btn-outline-danger btn-sm" onClick={fetchDashboard}>
          Retry
        </button>
      </div>
    );
  }

  const metrics = data?.metrics || {
    customers: { total: 0, active: 0, inactive: 0 },
    leads: { total: 0, new: 0, qualified: 0, converted: 0, lost: 0, conversionRate: 0 },
    opportunities: { total: 0, open: 0, closedWon: 0, closedLost: 0, pipelineAmount: 0, wonAmount: 0 },
    followUps: { total: 0, pending: 0, completed: 0, cancelled: 0, upcoming: 0 },
  };

  // 1. Lead Status Distribution Chart Data
  const leadChartData = {
    labels: ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'],
    datasets: [
      {
        label: 'Leads',
        data: [
          metrics.leads.new || 0,
          metrics.leads.contacted || 0,
          metrics.leads.qualified || 0,
          metrics.leads.lost || 0,
          metrics.leads.converted || 0,
        ],
        backgroundColor: [
          '#3b82f6', // blue
          '#06b6d4', // cyan
          '#f59e0b', // amber
          '#ef4444', // red
          '#10b981', // green
        ],
        borderWidth: 1,
      },
    ],
  };

  // 2. Opportunity Pipeline Stages Chart Data
  const oppStages = data?.charts?.opportunityPipeline || [];
  const pipelineChartData = {
    labels: oppStages.map((s) => s.stage),
    datasets: [
      {
        label: 'Deals Count',
        data: oppStages.map((s) => s.count || 0),
        backgroundColor: 'rgba(37, 99, 235, 0.75)',
        borderColor: '#2563eb',
        borderWidth: 1,
      },
    ],
  };

  // 3. Follow-Up Status Chart Data
  const followUpChartData = {
    labels: ['Pending', 'Completed', 'Cancelled'],
    datasets: [
      {
        label: 'Follow-Ups',
        data: [
          metrics.followUps.pending || 0,
          metrics.followUps.completed || 0,
          metrics.followUps.cancelled || 0,
        ],
        backgroundColor: ['#f59e0b', '#10b981', '#94a3b8'],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          font: { size: 12 },
        },
      },
    },
  };

  return (
    <div className="dashboard-page pb-5">
      {/* Page Header */}
      <div className="crm-page-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <span className={`badge ${getRoleBadgeClass(user?.role)}`}>
              {user?.role}
            </span>
            <span className="small text-muted">{data?.scope}</span>
          </div>
          <h2 className="crm-page-title">Welcome back, {user?.name}!</h2>
          <p className="crm-page-subtitle">
            Here's an overview of your CRM activity.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Link to="/reports" className="btn btn-primary btn-sm">
            View Reports
          </Link>
          <Link to="/opportunities" className="btn btn-outline-secondary btn-sm">
            Opportunities
          </Link>
          <Link to="/followups" className="btn btn-outline-secondary btn-sm">
            Follow-Ups
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards (6 Cards) */}
      <div className="row g-3 mb-4">
        {/* Total Leads */}
        <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
          <div className="card crm-card h-100">
            <div className="card-body p-3">
              <div className="text-muted small fw-semibold">Total Leads</div>
              <div className="fs-3 fw-bold text-dark my-1">{metrics.leads.total}</div>
              <div className="small text-muted">{metrics.leads.conversionRate}% Win Rate</div>
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
          <div className="card crm-card h-100">
            <div className="card-body p-3">
              <div className="text-muted small fw-semibold">Total Customers</div>
              <div className="fs-3 fw-bold text-dark my-1">{metrics.customers.total}</div>
              <div className="small text-success">{metrics.customers.active} Active accounts</div>
            </div>
          </div>
        </div>

        {/* Open Opportunities */}
        <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
          <div className="card crm-card h-100">
            <div className="card-body p-3">
              <div className="text-muted small fw-semibold">Open Deals</div>
              <div className="fs-3 fw-bold text-primary my-1">{metrics.opportunities.open}</div>
              <div className="small text-muted">{metrics.opportunities.total} Total registered</div>
            </div>
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
          <div className="card crm-card h-100">
            <div className="card-body p-3">
              <div className="text-muted small fw-semibold">Pipeline Value</div>
              <div className="fs-4 fw-bold text-primary my-1 text-truncate" title={formatCurrency(metrics.opportunities.pipelineAmount)}>
                {formatCurrency(metrics.opportunities.pipelineAmount)}
              </div>
              <div className="small text-muted">Active deal value</div>
            </div>
          </div>
        </div>

        {/* Won Value */}
        <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
          <div className="card crm-card h-100">
            <div className="card-body p-3">
              <div className="text-muted small fw-semibold">Won Value</div>
              <div className="fs-4 fw-bold text-success my-1 text-truncate" title={formatCurrency(metrics.opportunities.wonAmount)}>
                {formatCurrency(metrics.opportunities.wonAmount)}
              </div>
              <div className="small text-success">{metrics.opportunities.closedWon} Closed deals</div>
            </div>
          </div>
        </div>

        {/* Pending Follow-Ups */}
        <div className="col-12 col-sm-6 col-lg-4 col-xl-2">
          <div className="card crm-card h-100">
            <div className="card-body p-3">
              <div className="text-muted small fw-semibold">Pending Tasks</div>
              <div className="fs-3 fw-bold text-warning my-1">{metrics.followUps.pending}</div>
              <div className="small text-muted">{metrics.followUps.upcoming} Upcoming scheduled</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section (3 Essential Charts) */}
      <div className="row g-3 mb-4">
        {/* Chart 1: Opportunity Pipeline */}
        <div className="col-12 col-lg-6">
          <div className="card crm-card h-100">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <span className="fw-semibold small">Opportunity Pipeline by Stage</span>
              <span className="badge bg-light text-muted border">Stages</span>
            </div>
            <div className="card-body" style={{ height: '260px' }}>
              {metrics.opportunities.total > 0 ? (
                <Bar
                  data={pipelineChartData}
                  options={{
                    ...chartOptions,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                      },
                    },
                  }}
                />
              ) : (
                <div className="crm-empty-state py-4 my-2">
                  <div className="crm-empty-state-title">No opportunities found</div>
                  <div className="crm-empty-state-text small">Create new deals to view pipeline progress.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart 2: Lead Status Distribution */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card crm-card h-100">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <span className="fw-semibold small">Lead Distribution</span>
              <span className="badge bg-light text-muted border">Funnel</span>
            </div>
            <div className="card-body" style={{ height: '260px' }}>
              {metrics.leads.total > 0 ? (
                <Doughnut data={leadChartData} options={chartOptions} />
              ) : (
                <div className="crm-empty-state py-4 my-2">
                  <div className="crm-empty-state-title">No leads recorded</div>
                  <div className="crm-empty-state-text small">Add leads to see funnel distribution.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chart 3: Follow-Up Status */}
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card crm-card h-100">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <span className="fw-semibold small">Follow-Up Activity</span>
              <span className="badge bg-light text-muted border">Tasks</span>
            </div>
            <div className="card-body" style={{ height: '260px' }}>
              {metrics.followUps.total > 0 ? (
                <Doughnut data={followUpChartData} options={chartOptions} />
              ) : (
                <div className="crm-empty-state py-4 my-2">
                  <div className="crm-empty-state-title">No follow-ups scheduled</div>
                  <div className="crm-empty-state-text small">Schedule calls and meetings to track tasks.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
