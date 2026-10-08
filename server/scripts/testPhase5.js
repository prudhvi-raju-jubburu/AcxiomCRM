/**
 * Automated Test Suite for Phase 5: Dashboard, Reports & Analytics
 * Run using: node scripts/testPhase5.js
 */

const API_BASE = 'http://localhost:5000/api';

let adminToken = '';
let managerToken = '';
let salesToken = '';
let salesBToken = '';

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failedCount++;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    // If not json
  }
  return { status: response.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 5 AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  try {
    // ----------------------------------------------------
    // SETUP & AUTHENTICATION
    // ----------------------------------------------------
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@acxiom.com', password: 'Admin@123' }),
    });
    adminToken = adminLogin.data?.data?.token;

    const managerLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'manager@acxiom.com', password: 'Manager@123' }),
    });
    managerToken = managerLogin.data?.data?.token;

    const salesLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'sales@acxiom.com', password: 'Sales@123' }),
    });
    salesToken = salesLogin.data?.data?.token;

    // Register temporary Sales Executive B for data isolation verification
    const emailB = `salesb_${Date.now()}@acxiom.com`;
    const regB = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Sales Exec Beta',
        email: emailB,
        password: 'Password@123',
      }),
    });
    salesBToken = regB.data?.data?.token;

    // ----------------------------------------------------
    // DASHBOARD TESTS
    // ----------------------------------------------------
    // 1. Admin dashboard works
    const adminDash = await request('/dashboard/summary', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminDash.status === 200 &&
        adminDash.data.success === true &&
        adminDash.data.data.metrics.customers.total >= 0 &&
        adminDash.data.data.metrics.leads.total >= 0 &&
        adminDash.data.data.metrics.opportunities.total >= 0,
      '1. Admin dashboard works and returns organization-wide metrics'
    );

    // 2. Manager dashboard works
    const managerDash = await request('/dashboard/summary', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(
      managerDash.status === 200 &&
        managerDash.data.success === true &&
        managerDash.data.data.metrics.opportunities.total >= 0,
      '2. Manager dashboard works and returns team-level metrics'
    );

    // 3. Sales Executive dashboard works
    const salesDash = await request('/dashboard/summary', {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    assert(
      salesDash.status === 200 &&
        salesDash.data.success === true &&
        salesDash.data.data.isSalesExecutive === true,
      '3. Sales Executive dashboard works and indicates personal scope'
    );

    // 4. Sales Executive receives only own metrics
    const salesTotalOpps = salesDash.data.data.metrics.opportunities.total;
    const adminTotalOpps = adminDash.data.data.metrics.opportunities.total;
    assert(
      salesTotalOpps <= adminTotalOpps,
      '4. Sales Executive receives only own metrics (subset of organization total)'
    );

    // 5. Unauthenticated dashboard request returns 401
    const unauthDash = await request('/dashboard/summary');
    assert(
      unauthDash.status === 401,
      '5. Unauthenticated dashboard request returns HTTP 401'
    );

    // ----------------------------------------------------
    // REPORTS TESTS
    // ----------------------------------------------------
    // 6. Customer report works
    const custReport = await request('/reports/customers', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      custReport.status === 200 &&
        custReport.data.success === true &&
        Array.isArray(custReport.data.data.customers) &&
        custReport.data.data.summary.total >= 0,
      '6. Customer report works and returns structured summaries'
    );

    // 7. Lead report works
    const leadReport = await request('/reports/leads', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      leadReport.status === 200 &&
        leadReport.data.success === true &&
        typeof leadReport.data.data.summary.conversionRate === 'number' &&
        leadReport.data.data.summary.byStatus.New !== undefined,
      '7. Lead report works with status distribution and conversion rate'
    );

    // 8. Follow-up report works
    const fuReport = await request('/reports/followups', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      fuReport.status === 200 &&
        fuReport.data.success === true &&
        Array.isArray(fuReport.data.data.followUps) &&
        fuReport.data.data.summary.pending !== undefined,
      '8. Follow-up report works with status and activity type breakdowns'
    );

    // 9. Opportunity report works
    const oppReport = await request('/reports/opportunities', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      oppReport.status === 200 &&
        oppReport.data.success === true &&
        typeof oppReport.data.data.summary.pipelineAmount === 'number' &&
        Array.isArray(oppReport.data.data.summary.byStage),
      '9. Opportunity report works with pipeline and won calculations'
    );

    // 10. Pipeline report works
    const pipeReport = await request('/reports/pipeline', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      pipeReport.status === 200 &&
        pipeReport.data.success === true &&
        pipeReport.data.data.stages.length === 6 &&
        typeof pipeReport.data.data.pipelineValue === 'number',
      '10. Sales pipeline report returns all 6 stages and active pipeline value'
    );

    // 11. Conversion report works
    const convReport = await request('/reports/conversion', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      convReport.status === 200 &&
        convReport.data.success === true &&
        Array.isArray(convReport.data.data.sources) &&
        typeof convReport.data.data.conversionRate === 'number',
      '11. Lead conversion report returns overall conversion rate and source breakdowns'
    );

    // 12. Admin can access user performance
    const adminPerf = await request('/reports/user-performance', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminPerf.status === 200 &&
        adminPerf.data.success === true &&
        Array.isArray(adminPerf.data.data.executives),
      '12. Admin can access user performance report'
    );

    // 13. Manager can access user performance
    const mgrPerf = await request('/reports/user-performance', {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(
      mgrPerf.status === 200 &&
        mgrPerf.data.success === true &&
        Array.isArray(mgrPerf.data.data.executives),
      '13. Manager can access user performance report'
    );

    // 14. Sales Executive receives 403 for user performance
    const salesPerf = await request('/reports/user-performance', {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    assert(
      salesPerf.status === 403,
      '14. Sales Executive receives HTTP 403 Forbidden for user performance report'
    );

    // ----------------------------------------------------
    // BUSINESS CALCULATIONS
    // ----------------------------------------------------
    // 15. Lead conversion rate is correct
    const lSummary = leadReport.data.data.summary;
    const expectedRate =
      lSummary.total > 0
        ? Number(((lSummary.byStatus.Converted / lSummary.total) * 100).toFixed(1))
        : 0;
    assert(
      lSummary.conversionRate === expectedRate,
      `15. Lead conversion rate is accurately calculated (${lSummary.conversionRate}% === ${expectedRate}%)`
    );

    // 16. Zero leads does not produce NaN/Infinity
    const zeroLeadsReport = await request('/reports/leads?startDate=2099-01-01&endDate=2099-12-31', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      zeroLeadsReport.status === 200 &&
        zeroLeadsReport.data.data.summary.total === 0 &&
        zeroLeadsReport.data.data.summary.conversionRate === 0 &&
        !isNaN(zeroLeadsReport.data.data.summary.conversionRate),
      '16. Zero leads handled gracefully without producing NaN or Infinity'
    );

    // 17. Pipeline amount is calculated correctly
    const pSummary = oppReport.data.data.summary;
    const calculatedPipeline = pSummary.byStage
      .filter((s) => ['Prospecting', 'Qualification', 'Proposal', 'Negotiation'].includes(s.stage))
      .reduce((sum, s) => sum + s.amount, 0);
    assert(
      pSummary.pipelineAmount === calculatedPipeline,
      `17. Pipeline amount matches active stages sum (${pSummary.pipelineAmount} === ${calculatedPipeline})`
    );

    // 18. Won amount is calculated correctly
    const wonStage = pSummary.byStage.find((s) => s.stage === 'Closed Won');
    assert(
      pSummary.wonAmount === (wonStage ? wonStage.amount : 0),
      `18. Won amount correctly represents Closed Won deals (${pSummary.wonAmount})`
    );

    // 19. Opportunity stage counts are correct
    const sumStageCounts = pSummary.byStage.reduce((sum, s) => sum + s.count, 0);
    assert(
      sumStageCounts === pSummary.total,
      `19. Sum of opportunity stage counts equals total (${sumStageCounts} === ${pSummary.total})`
    );

    // 20. Follow-up status counts are correct
    const fSummary = fuReport.data.data.summary;
    assert(
      fSummary.pending + fSummary.completed + fSummary.cancelled === fSummary.total,
      `20. Follow-up status counts sum up to total (${fSummary.pending + fSummary.completed + fSummary.cancelled} === ${fSummary.total})`
    );

    // ----------------------------------------------------
    // ROLE DATA ISOLATION
    // ----------------------------------------------------
    // 21. Sales Executive A cannot receive Sales Executive B's metrics
    const salesBDash = await request('/dashboard/summary', {
      headers: { Authorization: `Bearer ${salesBToken}` },
    });
    assert(
      salesBDash.status === 200 &&
        salesBDash.data.data.metrics.opportunities.total === 0 &&
        salesBDash.data.data.metrics.customers.total === 0,
      '21. Sales Executive B receives zero metrics (strictly isolated from Sales Executive A)'
    );

    // 22. Manager/Admin data visibility works correctly
    assert(
      adminDash.data.data.metrics.opportunities.total >= salesDash.data.data.metrics.opportunities.total &&
        managerDash.data.data.metrics.opportunities.total >= salesDash.data.data.metrics.opportunities.total,
      '22. Manager and Admin have organization/team oversight superior to or equal to individual executive'
    );

    // ----------------------------------------------------
    // DATE FILTERS
    // ----------------------------------------------------
    // 23. Valid date filter works
    const dateFilteredReport = await request(
      '/reports/opportunities?startDate=2020-01-01&endDate=2030-12-31',
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(
      dateFilteredReport.status === 200 && dateFilteredReport.data.success === true,
      '23. Valid date filter range (2020-01-01 to 2030-12-31) accepted and executed'
    );

    // 24. Invalid date filter is rejected appropriately
    const invalidDateReport = await request(
      '/reports/opportunities?startDate=not-a-real-date',
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(
      invalidDateReport.status === 400 &&
        invalidDateReport.data.success === false,
      '24. Invalid date filter string is rejected with HTTP 400 Bad Request'
    );

    // 25. Date filter with startDate after endDate is rejected
    const reversedDatesReport = await request(
      '/reports/opportunities?startDate=2026-12-31&endDate=2026-01-01',
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(
      reversedDatesReport.status === 400 &&
        reversedDatesReport.data.success === false,
      '25. Inverted date range (startDate > endDate) is rejected with HTTP 400'
    );

  } catch (err) {
    console.error('Test suite error:', err);
    failedCount++;
  }

  console.log('\n====================================================');
  console.log(`PHASE 5 TEST SUITE FINISHED: ${passedCount} Passed, ${failedCount} Failed`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
