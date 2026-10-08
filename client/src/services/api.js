import axios from 'axios';

/**
 * Centralized Axios instance for AcxiomCRM.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Request Interceptor:
 * Injects JWT Bearer token from localStorage into Authorization header
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('acxiom_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor:
 * Standardizes API error formatting across the application
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred. Please try again.';

    const customError = {
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    };

    return Promise.reject(customError);
  }
);

// ==========================================
// API SERVICE METHODS
// ==========================================

// Health Check
export const checkBackendHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Authentication Endpoints
export const loginApi = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const registerApi = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const getMeApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const logoutApi = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

// User Management Endpoints (Admin Only)
export const getUsersApi = async (params = {}) => {
  const response = await api.get('/users', { params });
  return response.data;
};

export const createUserApi = async (userData) => {
  const response = await api.post('/users', userData);
  return response.data;
};

export const updateUserApi = async (id, userData) => {
  const response = await api.put(`/users/${id}`, userData);
  return response.data;
};

export const toggleUserStatusApi = async (id) => {
  const response = await api.patch(`/users/${id}/status`);
  return response.data;
};

// ==========================================
// PHASE 3: CUSTOMER APIS
// ==========================================

export const getCustomersApi = async (params = {}) => {
  const response = await api.get('/customers', { params });
  return response.data;
};

export const getCustomerByIdApi = async (id) => {
  const response = await api.get(`/customers/${id}`);
  return response.data;
};

export const createCustomerApi = async (customerData) => {
  const response = await api.post('/customers', customerData);
  return response.data;
};

export const updateCustomerApi = async (id, customerData) => {
  const response = await api.put(`/customers/${id}`, customerData);
  return response.data;
};

export const deleteCustomerApi = async (id) => {
  const response = await api.delete(`/customers/${id}`);
  return response.data;
};

// ==========================================
// PHASE 3: LEAD APIS
// ==========================================

export const getLeadsApi = async (params = {}) => {
  const response = await api.get('/leads', { params });
  return response.data;
};

export const getLeadByIdApi = async (id) => {
  const response = await api.get(`/leads/${id}`);
  return response.data;
};

export const createLeadApi = async (leadData) => {
  const response = await api.post('/leads', leadData);
  return response.data;
};

export const updateLeadApi = async (id, leadData) => {
  const response = await api.put(`/leads/${id}`, leadData);
  return response.data;
};

export const deleteLeadApi = async (id) => {
  const response = await api.delete(`/leads/${id}`);
  return response.data;
};

export const convertLeadApi = async (id) => {
  const response = await api.post(`/leads/${id}/convert`);
  return response.data;
};

// ==========================================
// PHASE 4: OPPORTUNITY APIS
// ==========================================

export const getOpportunitiesApi = async (params = {}) => {
  const response = await api.get('/opportunities', { params });
  return response.data;
};

export const getOpportunityByIdApi = async (id) => {
  const response = await api.get(`/opportunities/${id}`);
  return response.data;
};

export const createOpportunityApi = async (opportunityData) => {
  const response = await api.post('/opportunities', opportunityData);
  return response.data;
};

export const updateOpportunityApi = async (id, opportunityData) => {
  const response = await api.put(`/opportunities/${id}`, opportunityData);
  return response.data;
};

export const deleteOpportunityApi = async (id) => {
  const response = await api.delete(`/opportunities/${id}`);
  return response.data;
};

// ==========================================
// PHASE 4: FOLLOW-UP APIS
// ==========================================

export const getFollowUpsApi = async (params = {}) => {
  const response = await api.get('/followups', { params });
  return response.data;
};

export const getFollowUpByIdApi = async (id) => {
  const response = await api.get(`/followups/${id}`);
  return response.data;
};

export const createFollowUpApi = async (followUpData) => {
  const response = await api.post('/followups', followUpData);
  return response.data;
};

export const updateFollowUpApi = async (id, followUpData) => {
  const response = await api.put(`/followups/${id}`, followUpData);
  return response.data;
};

export const deleteFollowUpApi = async (id) => {
  const response = await api.delete(`/followups/${id}`);
  return response.data;
};

// ==========================================
// PHASE 5: DASHBOARD & REPORT APIS
// ==========================================

export const getDashboardSummaryApi = async (params = {}) => {
  const response = await api.get('/dashboard/summary', { params });
  return response.data;
};

export const getCustomerReportApi = async (params = {}) => {
  const response = await api.get('/reports/customers', { params });
  return response.data;
};

export const getLeadReportApi = async (params = {}) => {
  const response = await api.get('/reports/leads', { params });
  return response.data;
};

export const getFollowUpReportApi = async (params = {}) => {
  const response = await api.get('/reports/followups', { params });
  return response.data;
};

export const getOpportunityReportApi = async (params = {}) => {
  const response = await api.get('/reports/opportunities', { params });
  return response.data;
};

export const getPipelineReportApi = async (params = {}) => {
  const response = await api.get('/reports/pipeline', { params });
  return response.data;
};

export const getConversionReportApi = async (params = {}) => {
  const response = await api.get('/reports/conversion', { params });
  return response.data;
};

export const getUserPerformanceReportApi = async (params = {}) => {
  const response = await api.get('/reports/user-performance', { params });
  return response.data;
};

export default api;

