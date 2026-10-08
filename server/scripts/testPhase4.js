/**
 * Phase 4 Automated Verification Test Suite
 * Tests Opportunities, Follow-Ups / Sales Activities, Business Rules,
 * and Role-Based Access Controls.
 */
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 4 AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  };

  try {
    // Helper function for login
    const loginAs = async (email, password) => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      return { token: data.data?.token, user: data.data?.user };
    };

    // 1-3. Admin, Manager, Sales Executive Logins
    const admin = await loginAs('admin@acxiom.com', 'Admin@123');
    const manager = await loginAs('manager@acxiom.com', 'Manager@123');
    const sales = await loginAs('sales@acxiom.com', 'Sales@123');

    assert(!!admin.token, '1. Admin authenticated successfully');
    assert(!!manager.token, '2. Manager authenticated successfully');
    assert(!!sales.token, '3. Sales Executive authenticated successfully');

    // Fetch existing customer and lead for testing associations
    const custRes = await fetch(`${BASE_URL}/customers`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const custData = await custRes.json();
    const testCustomer = custData.data[0];

    const leadRes = await fetch(`${BASE_URL}/leads`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const leadData = await leadRes.json();
    const testLead = leadData.data[0];

    const futureDate = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString();
    };

    const pastDate = () => {
      const d = new Date();
      d.setDate(d.getDate() - 10);
      return d.toISOString();
    };

    // 4. Create opportunity by Sales Executive
    const createOppRes = await fetch(`${BASE_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        name: 'Enterprise CRM Add-on Licenses',
        customer: testCustomer._id,
        lead: testLead?._id,
        amount: 25000,
        probability: 30,
        stage: 'Prospecting',
        expectedCloseDate: futureDate(25),
        description: 'Prospecting add-on modules for support desk.',
      }),
    });
    const createOppData = await createOppRes.json();
    assert(createOppRes.status === 201 && createOppData.data.name === 'Enterprise CRM Add-on Licenses', '4. Sales Executive creates opportunity');
    const testOppId = createOppData.data._id;

    // 5. Retrieve opportunity
    const getOppRes = await fetch(`${BASE_URL}/opportunities/${testOppId}`, {
      headers: { Authorization: `Bearer ${sales.token}` },
    });
    const getOppData = await getOppRes.json();
    assert(getOppRes.status === 200 && getOppData.data._id === testOppId, '5. Retrieve single opportunity with populated fields');

    // 6. Update opportunity
    const updateOppRes = await fetch(`${BASE_URL}/opportunities/${testOppId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        stage: 'Proposal',
        probability: 50,
      }),
    });
    const updateOppData = await updateOppRes.json();
    assert(updateOppRes.status === 200 && updateOppData.data.stage === 'Proposal', '6. Update opportunity stage and probability');

    // 7. Invalid amount rejected (<= 0)
    const invalidAmountRes = await fetch(`${BASE_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        name: 'Zero Amount Deal',
        customer: testCustomer._id,
        amount: -100,
        expectedCloseDate: futureDate(10),
      }),
    });
    assert(invalidAmountRes.status === 400, '7. Negative/zero amount rejected with HTTP 400');

    // 8. Probability > 100 rejected
    const highProbRes = await fetch(`${BASE_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        name: 'Over 100 Prob Deal',
        customer: testCustomer._id,
        amount: 1000,
        probability: 150,
        expectedCloseDate: futureDate(10),
      }),
    });
    assert(highProbRes.status === 400, '8. Probability > 100 rejected with HTTP 400');

    // 9. Probability < 0 rejected
    const lowProbRes = await fetch(`${BASE_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        name: 'Negative Prob Deal',
        customer: testCustomer._id,
        amount: 1000,
        probability: -5,
        expectedCloseDate: futureDate(10),
      }),
    });
    assert(lowProbRes.status === 400, '9. Probability < 0 rejected with HTTP 400');

    // 10. Invalid stage rejected
    const invalidStageRes = await fetch(`${BASE_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        name: 'Invalid Stage Deal',
        customer: testCustomer._id,
        amount: 5000,
        stage: 'RandomStageName',
        expectedCloseDate: futureDate(10),
      }),
    });
    assert(invalidStageRes.status === 400, '10. Invalid stage value rejected with HTTP 400');

    // 11. Past close date rejected for active opportunity
    const pastCloseDateRes = await fetch(`${BASE_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        name: 'Past Due Deal',
        customer: testCustomer._id,
        amount: 5000,
        stage: 'Negotiation',
        expectedCloseDate: pastDate(),
      }),
    });
    assert(pastCloseDateRes.status === 400, '11. Past expected close date rejected for active opportunity with HTTP 400');

    // 12. Sales Executive cannot view another user's opportunity
    // Manager creates an opportunity assigned to manager
    const mgrOppRes = await fetch(`${BASE_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${manager.token}`,
      },
      body: JSON.stringify({
        name: 'Manager Supervised Opportunity',
        customer: testCustomer._id,
        amount: 60000,
        expectedCloseDate: futureDate(20),
        assignedTo: manager.user.id,
      }),
    });
    const mgrOppData = await mgrOppRes.json();
    const mgrOppId = mgrOppData.data._id;

    const salesAccessMgrOpp = await fetch(`${BASE_URL}/opportunities/${mgrOppId}`, {
      headers: { Authorization: `Bearer ${sales.token}` },
    });
    assert(salesAccessMgrOpp.status === 403, "12. Sales Executive cannot view another user's opportunity (HTTP 403)");

    // 13. Sales Executive cannot reassign another user's opportunity
    const salesReassignOpp = await fetch(`${BASE_URL}/opportunities/${mgrOppId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        assignedTo: sales.user.id,
      }),
    });
    assert(salesReassignOpp.status === 403, "13. Sales Executive cannot reassign an unauthorized opportunity (HTTP 403)");

    // 14. Closed Won updates probability to 100
    const wonRes = await fetch(`${BASE_URL}/opportunities/${testOppId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        stage: 'Closed Won',
      }),
    });
    const wonData = await wonRes.json();
    assert(wonRes.status === 200 && wonData.data.probability === 100, '14. Transition to Closed Won automatically sets probability to 100%');

    // 15. Closed Lost updates probability to 0
    const lostOppRes = await fetch(`${BASE_URL}/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({
        name: 'Decline Lost Deal',
        customer: testCustomer._id,
        amount: 15000,
        expectedCloseDate: futureDate(5),
      }),
    });
    const lostOppData = await lostOppRes.json();
    const lostOppId = lostOppData.data._id;

    const lostUpdateRes = await fetch(`${BASE_URL}/opportunities/${lostOppId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({
        stage: 'Closed Lost',
      }),
    });
    const lostUpdateData = await lostUpdateRes.json();
    assert(lostUpdateRes.status === 200 && lostUpdateData.data.probability === 0, '15. Transition to Closed Lost automatically sets probability to 0%');

    // ==========================================
    // FOLLOW-UP TESTS (16 - 24)
    // ==========================================

    // 16. Create follow-up
    const createFuRes = await fetch(`${BASE_URL}/followups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        subject: 'Weekly Status Call with Lead Sponsor',
        customer: testCustomer._id,
        opportunity: testOppId,
        type: 'Call',
        scheduledDate: futureDate(3),
        status: 'Pending',
        description: 'Discuss delivery milestones and kick-off date.',
      }),
    });
    const createFuData = await createFuRes.json();
    assert(createFuRes.status === 201 && createFuData.data.subject === 'Weekly Status Call with Lead Sponsor', '16. Sales Executive creates follow-up activity');
    const testFuId = createFuData.data._id;

    // 17. Retrieve follow-up
    const getFuRes = await fetch(`${BASE_URL}/followups/${testFuId}`, {
      headers: { Authorization: `Bearer ${sales.token}` },
    });
    const getFuData = await getFuRes.json();
    assert(getFuRes.status === 200 && getFuData.data._id === testFuId, '17. Retrieve follow-up by ID with populated references');

    // 18. Update follow-up
    const updateFuRes = await fetch(`${BASE_URL}/followups/${testFuId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        notes: 'Call went well. Customer confirmed purchase order release.',
      }),
    });
    const updateFuData = await updateFuRes.json();
    assert(updateFuRes.status === 200 && updateFuData.data.notes.includes('purchase order release'), '18. Update follow-up notes successfully');

    // 19. Invalid status rejected
    const invalidFuStatusRes = await fetch(`${BASE_URL}/followups/${testFuId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({ status: 'InvalidStatusXYZ' }),
    });
    assert(invalidFuStatusRes.status === 400, '19. Invalid follow-up status rejected with HTTP 400');

    // 20. Invalid type rejected
    const invalidFuTypeRes = await fetch(`${BASE_URL}/followups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        subject: 'Invalid Activity Type',
        customer: testCustomer._id,
        type: 'Telegram',
        scheduledDate: futureDate(1),
      }),
    });
    assert(invalidFuTypeRes.status === 400, '20. Invalid follow-up type rejected with HTTP 400');

    // 21. Sales Executive sees only assigned follow-ups
    const salesFuListRes = await fetch(`${BASE_URL}/followups`, {
      headers: { Authorization: `Bearer ${sales.token}` },
    });
    const salesFuListData = await salesFuListRes.json();
    const allAssignedToSales = salesFuListData.data.every(
      (f) => f.assignedTo?._id === sales.user.id || f.assignedTo === sales.user.id
    );
    assert(allAssignedToSales, '21. Backend filters follow-up list to ONLY records assigned to the Sales Executive');

    // 22. Unauthorized access returns 403
    // Create follow-up assigned to manager
    const mgrFuRes = await fetch(`${BASE_URL}/followups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${manager.token}`,
      },
      body: JSON.stringify({
        subject: 'Manager Confidential Review',
        customer: testCustomer._id,
        scheduledDate: futureDate(2),
        assignedTo: manager.user.id,
      }),
    });
    const mgrFuData = await mgrFuRes.json();
    const mgrFuId = mgrFuData.data._id;

    const salesAccessMgrFu = await fetch(`${BASE_URL}/followups/${mgrFuId}`, {
      headers: { Authorization: `Bearer ${sales.token}` },
    });
    assert(salesAccessMgrFu.status === 403, "22. Sales Executive cannot access another user's follow-up (HTTP 403)");

    // 23. Completed follow-up behaves correctly
    const completeFuRes = await fetch(`${BASE_URL}/followups/${testFuId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({ status: 'Completed' }),
    });
    const completeFuData = await completeFuRes.json();
    assert(completeFuRes.status === 200 && completeFuData.data.status === 'Completed', '23. Follow-up status updated to Completed');

    // 24. Cancelled follow-up behaves correctly
    const cancelFuRes = await fetch(`${BASE_URL}/followups/${testFuId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({ status: 'Cancelled' }),
    });
    const cancelFuData = await cancelFuRes.json();
    assert(cancelFuRes.status === 200 && cancelFuData.data.status === 'Cancelled', '24. Follow-up status updated to Cancelled');

    // ==========================================
    // RELATIONSHIPS TESTS (25 - 27)
    // ==========================================

    // 25. Opportunity correctly references Customer
    assert(getOppData.data.customer?._id === testCustomer._id, '25. Opportunity correctly references Customer');

    // 26. Opportunity can preserve originating Lead
    assert(!!getOppData.data.lead, '26. Opportunity preserves originating Lead reference');

    // 27. Follow-up can reference Customer, Lead, and Opportunity
    assert(
      getFuData.data.customer?._id === testCustomer._id &&
      getFuData.data.opportunity?._id === testOppId,
      '27. Follow-up links Customer and Opportunity entities'
    );

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`PHASE 4 TEST SUITE FINISHED: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
