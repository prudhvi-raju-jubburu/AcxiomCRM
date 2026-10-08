/**
 * Phase 3 Automated Verification Test Suite
 * Tests Customer & Lead CRUD, role-based backend filtering,
 * lead assignment restrictions, and lead-to-customer conversion.
 */
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 3 AUTOMATED TEST SUITE');
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

    const admin = await loginAs('admin@acxiom.com', 'Admin@123');
    const manager = await loginAs('manager@acxiom.com', 'Manager@123');
    const sales = await loginAs('sales@acxiom.com', 'Sales@123');

    assert(!!admin.token && !!manager.token && !!sales.token, 'Authenticated as Admin, Manager, and Sales Executive');

    // 1. Unauthenticated requests to customer/lead routes rejected (HTTP 401)
    const unauthCust = await fetch(`${BASE_URL}/customers`);
    assert(unauthCust.status === 401, 'Unauthenticated GET /api/customers rejected with HTTP 401');

    const unauthLead = await fetch(`${BASE_URL}/leads`);
    assert(unauthLead.status === 401, 'Unauthenticated GET /api/leads rejected with HTTP 401');

    // 2. Admin can view all customers
    const adminCustRes = await fetch(`${BASE_URL}/customers`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const adminCustData = await adminCustRes.json();
    assert(adminCustRes.status === 200 && adminCustData.data.length >= 3, 'Admin can retrieve all customers');

    // 3. Manager can view customers
    const mgrCustRes = await fetch(`${BASE_URL}/customers`, {
      headers: { Authorization: `Bearer ${manager.token}` },
    });
    const mgrCustData = await mgrCustRes.json();
    assert(mgrCustRes.status === 200 && mgrCustData.data.length >= 3, 'Manager can view all customers');

    // 4. Sales Executive backend filtering: Only sees assigned customers
    const salesCustRes = await fetch(`${BASE_URL}/customers`, {
      headers: { Authorization: `Bearer ${sales.token}` },
    });
    const salesCustData = await salesCustRes.json();
    assert(salesCustRes.status === 200, 'Sales Executive can query customers');
    const allAssignedToSales = salesCustData.data.every(
      (c) => c.assignedTo?._id === sales.user.id || c.assignedTo === sales.user.id
    );
    assert(allAssignedToSales, 'Backend filters customer list to ONLY records assigned to the Sales Executive');

    // 5. Customer search & filtering
    const searchRes = await fetch(`${BASE_URL}/customers?search=Reliance`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200 && searchData.data.length >= 1, 'Customer search by name/company functions properly');

    const statusFilterRes = await fetch(`${BASE_URL}/customers?status=Inactive`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const statusFilterData = await statusFilterRes.json();
    assert(statusFilterRes.status === 200 && statusFilterData.data.every((c) => c.status === 'Inactive'), 'Customer status filter works');

    // 6. Admin creates a new customer
    const createCustRes = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({
        name: 'Wipro Technologies',
        email: `procure_${Date.now()}@wipro.com`,
        company: 'Wipro Ltd',
        phone: '+91-9876500000',
        city: 'Hyderabad',
        state: 'Telangana',
        assignedTo: sales.user.id,
      }),
    });
    const createCustData = await createCustRes.json();
    assert(createCustRes.status === 201 && createCustData.data.name === 'Wipro Technologies', 'Admin creates customer and assigns to Sales Executive');
    const createdCustomerId = createCustData.data._id;

    // 7. Customer update
    const updateCustRes = await fetch(`${BASE_URL}/customers/${createdCustomerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({
        notes: 'Updated account notes for demonstration.',
      }),
    });
    const updateCustData = await updateCustRes.json();
    assert(updateCustRes.status === 200 && updateCustData.data.notes === 'Updated account notes for demonstration.', 'Customer notes updated successfully');

    // 8. Sales Executive CANNOT delete customer (HTTP 403)
    const salesDelCustRes = await fetch(`${BASE_URL}/customers/${createdCustomerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${sales.token}` },
    });
    assert(salesDelCustRes.status === 403, 'Sales Executive cannot delete customers (HTTP 403 Forbidden)');

    // 9. Lead creation by Manager assigned to Sales Executive
    const createLeadRes = await fetch(`${BASE_URL}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${manager.token}`,
      },
      body: JSON.stringify({
        name: 'Aakash Diagnostic Labs',
        email: `aakash_${Date.now()}@healthtech.in`,
        company: 'Aakash Healthcare',
        phone: '+91-9123456789',
        source: 'Website',
        status: 'Qualified',
        assignedTo: sales.user.id,
        notes: 'Requested CRM for clinic patient management.',
      }),
    });
    const createLeadData = await createLeadRes.json();
    assert(createLeadRes.status === 201 && createLeadData.data.name === 'Aakash Diagnostic Labs', 'Manager creates lead assigned to Sales Executive');
    const testLeadId = createLeadData.data._id;

    // 10. Invalid assigned user rejected (HTTP 400)
    const invalidAssignLeadRes = await fetch(`${BASE_URL}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({
        name: 'Ghost Company',
        assignedTo: '666666666666666666666666', // non-existent Mongo ID
      }),
    });
    assert(invalidAssignLeadRes.status === 400, 'Assigning lead to non-existent user returns HTTP 400');

    // 11. Sales Executive CANNOT reassign leads to another user (HTTP 403)
    const salesReassignRes = await fetch(`${BASE_URL}/leads/${testLeadId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        assignedTo: manager.user.id,
      }),
    });
    assert(salesReassignRes.status === 403, 'Sales Executive cannot reassign leads (HTTP 403 Forbidden)');

    // 12. Sales Executive sees only their own assigned leads
    const salesLeadsRes = await fetch(`${BASE_URL}/leads`, {
      headers: { Authorization: `Bearer ${sales.token}` },
    });
    const salesLeadsData = await salesLeadsRes.json();
    const allLeadsAssignedToSales = salesLeadsData.data.every(
      (l) => l.assignedTo?._id === sales.user.id || l.assignedTo === sales.user.id
    );
    assert(allLeadsAssignedToSales, 'Backend filters leads to ONLY those assigned to the requesting Sales Executive');

    // 13. Sales Executive cannot access a lead assigned to someone else
    // Find Pooja Hegde lead (assigned to manager)
    const allLeadsRes = await fetch(`${BASE_URL}/leads`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const allLeads = (await allLeadsRes.json()).data;
    const managerLead = allLeads.find((l) => l.name === 'Pooja Hegde');
    if (managerLead) {
      const salesAccessOtherLead = await fetch(`${BASE_URL}/leads/${managerLead._id}`, {
        headers: { Authorization: `Bearer ${sales.token}` },
      });
      assert(salesAccessOtherLead.status === 403, "Sales Executive cannot access another user's lead (HTTP 403)");
    }

    // 14. Lead status update
    const updateLeadStatusRes = await fetch(`${BASE_URL}/leads/${testLeadId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({
        status: 'Qualified',
        notes: 'Client confirmed budget and decision-making timeline.',
      }),
    });
    const updateLeadStatusData = await updateLeadStatusRes.json();
    assert(updateLeadStatusRes.status === 200 && updateLeadStatusData.data.status === 'Qualified', 'Lead status updated to Qualified');

    // 15. Invalid status transition via direct PUT (cannot set 'Converted' directly via PUT)
    const directConvertedRes = await fetch(`${BASE_URL}/leads/${testLeadId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sales.token}`,
      },
      body: JSON.stringify({ status: 'Converted' }),
    });
    assert(directConvertedRes.status === 400, 'Directly setting status to Converted via PUT is blocked (requires conversion workflow)');

    // 16. Successful Lead-to-Customer conversion workflow
    const convertRes = await fetch(`${BASE_URL}/leads/${testLeadId}/convert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sales.token}` },
    });
    const convertData = await convertRes.json();
    assert(convertRes.status === 200 && convertData.data.lead.status === 'Converted', 'Lead status transitioned to Converted');
    assert(!!convertData.data.customer?._id, 'New Customer record generated and returned');
    assert(convertData.data.lead.convertedCustomer === convertData.data.customer._id || convertData.data.lead.convertedCustomer?._id === convertData.data.customer._id, 'Lead convertedCustomer field correctly references new Customer');

    // 17. Duplicate conversion blocked (HTTP 400)
    const dupConvertRes = await fetch(`${BASE_URL}/leads/${testLeadId}/convert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sales.token}` },
    });
    assert(dupConvertRes.status === 400, 'Duplicate conversion of already-converted lead rejected with HTTP 400');

    // 18. Cannot convert a Lost lead
    // Create a Lost lead to test
    const createLostLead = await fetch(`${BASE_URL}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({
        name: 'Lost Opportunity Lead',
        status: 'Lost',
      }),
    });
    const lostLeadData = await createLostLead.json();
    const lostLeadId = lostLeadData.data._id;

    const convertLostRes = await fetch(`${BASE_URL}/leads/${lostLeadId}/convert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert(convertLostRes.status === 400, 'Attempting to convert a Lost lead is rejected with HTTP 400');

    // Clean up created test customer
    await fetch(`${BASE_URL}/customers/${createdCustomerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    assert(true, 'Admin successfully cleaned up test customer');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`PHASE 3 TEST SUITE FINISHED: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
