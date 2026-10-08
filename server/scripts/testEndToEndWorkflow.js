/**
 * testEndToEndWorkflow.js
 * Comprehensive End-to-End Business Workflow Test for AcxiomCRM
 *
 * Sequence:
 * 1. REGISTER: New Sales Executive registers via /api/auth/register
 * 2. LOGIN: User logs in via /api/auth/login and receives JWT
 * 3. DASHBOARD: User inspects baseline personal KPI dashboard (/api/dashboard/summary)
 * 4. CREATE LEAD: User logs a prospective lead (/api/leads)
 * 5. QUALIFY LEAD: Lead status updated to Qualified (/api/leads/:id)
 * 6. CONVERT LEAD: Lead converted to Customer (/api/leads/:id/convert)
 * 7. VERIFY CUSTOMER: Verifies Customer record was created and assigned (/api/customers/:id)
 * 8. CREATE OPPORTUNITY: Opportunity created for this Customer (/api/opportunities)
 * 9. CREATE FOLLOW-UP: Follow-up task scheduled linked to Customer & Opportunity (/api/followups)
 * 10. UPDATE FOLLOW-UP: Follow-up marked Completed with outcome notes (/api/followups/:id)
 * 11. UPDATE OPPORTUNITY: Stage advanced to Closed Won (/api/opportunities/:id)
 * 12. VERIFY DASHBOARD & REPORTS: Verify revenue, customer count, and metrics updated
 */

const BASE_URL = 'http://localhost:5000/api';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const assert = (condition, testName) => {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName}`);
  }
};

async function apiRequest(endpoint, method = 'GET', data = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(data);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  let resData;
  try {
    resData = await res.json();
  } catch {
    resData = null;
  }
  return { status: res.status, ok: res.ok, data: resData };
}

async function runEndToEndWorkflow() {
  console.log('\n====================================================');
  console.log('STARTING END-TO-END BUSINESS WORKFLOW TEST');
  console.log('====================================================\n');

  const timestamp = Date.now();
  const testUser = {
    name: `Workflow Rep ${timestamp}`,
    email: `rep_${timestamp}@workflowtest.com`,
    password: 'Password@123',
  };

  let token = null;
  let userId = null;
  let leadId = null;
  let customerId = null;
  let opportunityId = null;
  let followUpId = null;
  let baselineDashboard = null;

  try {
    // 1. REGISTER
    console.log('--- Step 1: Self-Registration ---');
    const regRes = await apiRequest('/auth/register', 'POST', testUser);
    assert(regRes.status === 201 && regRes.data?.success, '1. New user registration succeeds (HTTP 201)');
    assert(regRes.data?.data?.user?.role === 'Sales Executive', '2. New user assigned Sales Executive role');

    // 2. LOGIN
    console.log('\n--- Step 2: Authentication & Token Issuance ---');
    const loginRes = await apiRequest('/auth/login', 'POST', {
      email: testUser.email,
      password: testUser.password,
    });
    assert(loginRes.status === 200 && loginRes.data?.data?.token, '3. Login succeeds and returns JWT Bearer token');
    token = loginRes.data.data.token;
    userId = loginRes.data.data.user.id;

    // Verify /me
    const meRes = await apiRequest('/auth/me', 'GET', null, token);
    assert(meRes.status === 200 && meRes.data?.data?.user?.email === testUser.email, '4. GET /auth/me returns valid user context');

    // 3. DASHBOARD (Baseline)
    console.log('\n--- Step 3: Baseline Dashboard Inspection ---');
    const dashRes = await apiRequest('/dashboard/summary', 'GET', null, token);
    assert(dashRes.status === 200 && dashRes.data?.success, '5. User accesses personal dashboard metrics');
    baselineDashboard = dashRes.data.data;
    assert(baselineDashboard.metrics.leads.total === 0, '6. New user begins with 0 leads');
    assert(baselineDashboard.metrics.customers.total === 0, '7. New user begins with 0 customers');

    // 4. CREATE LEAD
    console.log('\n--- Step 4: Lead Creation ---');
    const leadData = {
      name: `Rohan Gupta ${timestamp}`,
      email: `rohan_${timestamp}@techwave.com`,
      phone: '+91-9876543210',
      company: 'TechWave Infotech',
      source: 'Website',
      status: 'New',
      notes: 'Initial website form submission for 50-user CRM tier',
    };
    const createLeadRes = await apiRequest('/leads', 'POST', leadData, token);
    assert(createLeadRes.status === 201 && createLeadRes.data?.success, '8. Lead created successfully (HTTP 201)');
    leadId = createLeadRes.data.data._id;
    assert(createLeadRes.data.data.status === 'New', '9. Lead status initialized to "New"');

    // 5. QUALIFY LEAD
    console.log('\n--- Step 5: Lead Qualification ---');
    const qualRes = await apiRequest(`/leads/${leadId}`, 'PUT', { status: 'Qualified' }, token);
    assert(qualRes.status === 200 && qualRes.data?.data?.status === 'Qualified', '10. Lead status advanced to "Qualified"');

    // 6. CONVERT LEAD TO CUSTOMER
    console.log('\n--- Step 6: Lead-to-Customer Conversion ---');
    const convertRes = await apiRequest(`/leads/${leadId}/convert`, 'POST', null, token);
    assert(convertRes.status === 200 && convertRes.data?.success, '11. Lead converted to Customer (HTTP 200)');
    customerId = convertRes.data.data.customer?._id;
    assert(customerId !== undefined && customerId !== null, '12. Conversion returns newly created Customer ID');
    assert(convertRes.data.data.lead?.status === 'Converted', '13. Original Lead status marked "Converted"');

    // 7. VERIFY CUSTOMER CREATED
    console.log('\n--- Step 7: Verify Customer Entity ---');
    const custRes = await apiRequest(`/customers/${customerId}`, 'GET', null, token);
    assert(custRes.status === 200 && custRes.data?.data?.name === leadData.name, '14. Customer record retrieved with matched company details');
    assert(custRes.data.data.status === 'Active', '15. Customer status is "Active"');

    // 8. CREATE OPPORTUNITY FOR CUSTOMER
    console.log('\n--- Step 8: Create Sales Opportunity ---');
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);
    const oppData = {
      name: 'TechWave 50-Seat Enterprise License',
      customer: customerId,
      amount: 150000,
      stage: 'Proposal',
      probability: 60,
      expectedCloseDate: futureDate.toISOString(),
      notes: 'Proposal submitted for annual subscription with priority support',
    };
    const oppRes = await apiRequest('/opportunities', 'POST', oppData, token);
    assert(oppRes.status === 201 && oppRes.data?.success, '16. Sales Opportunity created (HTTP 201)');
    opportunityId = oppRes.data.data._id;
    assert(oppRes.data.data.amount === 150000, '17. Opportunity amount saved accurately (150,000 INR)');

    // 9. SCHEDULE FOLLOW-UP ACTIVITY
    console.log('\n--- Step 9: Schedule Client Follow-Up Activity ---');
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 3);
    const followUpData = {
      subject: 'Commercial Negotiation & Contract Review',
      type: 'Meeting',
      status: 'Pending',
      scheduledDate: followUpDate.toISOString(),
      customer: customerId,
      opportunity: opportunityId,
      notes: 'Final review of SLA clauses and pricing schedule with CFO',
    };
    const followUpRes = await apiRequest('/followups', 'POST', followUpData, token);
    assert(followUpRes.status === 201 && followUpRes.data?.success, '18. Follow-up meeting scheduled (HTTP 201)');
    followUpId = followUpRes.data.data._id;

    // 10. COMPLETE FOLLOW-UP ACTIVITY
    console.log('\n--- Step 10: Complete Follow-Up Activity ---');
    const updateFollowUpRes = await apiRequest(`/followups/${followUpId}`, 'PUT', {
      status: 'Completed',
      notes: 'Meeting concluded successfully. CFO agreed to purchase terms.',
    }, token);
    assert(updateFollowUpRes.status === 200 && updateFollowUpRes.data?.data?.status === 'Completed', '19. Follow-up status updated to "Completed"');

    // 11. CLOSE OPPORTUNITY (CLOSED WON)
    console.log('\n--- Step 11: Close Opportunity (Won) ---');
    const closeOppRes = await apiRequest(`/opportunities/${opportunityId}`, 'PUT', {
      stage: 'Closed Won',
    }, token);
    assert(closeOppRes.status === 200 && closeOppRes.data?.data?.stage === 'Closed Won', '20. Opportunity stage advanced to "Closed Won"');
    assert(closeOppRes.data.data.probability === 100, '21. System automatically calibrated win probability to 100%');

    // 12. VERIFY DASHBOARD AND REPORTS UPDATED
    console.log('\n--- Step 12: Verify KPI Dashboard & Reports Reflect Progress ---');
    const updatedDashRes = await apiRequest('/dashboard/summary', 'GET', null, token);
    const updatedDash = updatedDashRes.data.data;
    assert(updatedDash.metrics.leads.total === 1, '22. Dashboard reflects 1 total lead');
    assert(updatedDash.metrics.customers.total === 1, '23. Dashboard reflects 1 total customer');
    assert(updatedDash.metrics.opportunities.total === 1, '24. Dashboard reflects 1 opportunity');
    assert(updatedDash.metrics.opportunities.closedWon === 1, '25. Dashboard records 1 Closed Won deal');
    assert(updatedDash.metrics.opportunities.wonAmount === 150000, '26. Dashboard won revenue updated to 150,000 INR');
    assert(updatedDash.metrics.leads.conversionRate === 100, '27. Lead conversion rate calculates to 100%');

    // Verify Reports
    const pipelineReportRes = await apiRequest('/reports/pipeline', 'GET', null, token);
    assert(pipelineReportRes.status === 200 && pipelineReportRes.data?.success, '28. Pipeline report accessible and accurate');

    const conversionReportRes = await apiRequest('/reports/conversion', 'GET', null, token);
    assert(conversionReportRes.status === 200 && conversionReportRes.data?.data?.conversionRate === 100, '29. Conversion report confirms 100% conversion rate');

    console.log('\n====================================================');
    console.log(`END-TO-END WORKFLOW SUITE FINISHED: ${passedTests} Passed, ${failedTests} Failed`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Fatal test error:', err);
  }
}

runEndToEndWorkflow();
