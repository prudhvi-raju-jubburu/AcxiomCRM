/**
 * Automated Verification Script for Registration Flow & Security
 * Run using: node scripts/testRegisterFlow.js
 */

const API_BASE = 'http://localhost:5000/api';

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
  } catch (err) {}
  return { status: response.status, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('STARTING REGISTRATION FLOW AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  try {
    const timestamp = Date.now();
    const validEmail = `newuser_${timestamp}@acxiom.com`;
    const validPassword = 'SecurePassword@123';

    // 1. Valid registration succeeds
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Priya Sharma',
        email: validEmail,
        password: validPassword,
      }),
    });
    assert(
      regRes.status === 201 && regRes.data.success === true,
      '1. Valid registration succeeds with HTTP 201 Created'
    );

    // 2. New account automatically receives Sales Executive role
    assert(
      regRes.data.data.user.role === 'Sales Executive',
      '2. New account receives default role "Sales Executive"'
    );

    // 3. Password is NOT returned in the API response
    assert(
      !regRes.data.data.user.password && !regRes.data.data.user.hash,
      '3. Sensitive password/hash is NOT returned in registration response'
    );

    // 4. Duplicate email registration returns HTTP 409
    const dupRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Another User',
        email: validEmail,
        password: 'AnotherPassword@123',
      }),
    });
    assert(
      dupRes.status === 409 && dupRes.data.success === false,
      '4. Duplicate email returns HTTP 409 Conflict'
    );

    // 5. Invalid email format is rejected with HTTP 400
    const invalidEmailRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Invalid Email Guy',
        email: 'invalid-email-no-domain',
        password: 'ValidPassword123',
      }),
    });
    assert(
      invalidEmailRes.status === 400 && invalidEmailRes.data.success === false,
      '5. Invalid email format is rejected with HTTP 400'
    );

    // 6. Missing name is rejected with HTTP 400
    const missingNameRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: '   ',
        email: `noname_${timestamp}@acxiom.com`,
        password: 'ValidPassword123',
      }),
    });
    assert(
      missingNameRes.status === 400 && missingNameRes.data.success === false,
      '6. Empty/whitespace name is rejected with HTTP 400'
    );

    // 7. Missing password is rejected with HTTP 400
    const missingPassRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'No Password User',
        email: `nopass_${timestamp}@acxiom.com`,
      }),
    });
    assert(
      missingPassRes.status === 400 && missingPassRes.data.success === false,
      '7. Missing password is rejected with HTTP 400'
    );

    // 8. Short password (< 6 chars) is rejected with HTTP 400
    const shortPassRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Short Pass User',
        email: `short_${timestamp}@acxiom.com`,
        password: '12345',
      }),
    });
    assert(
      shortPassRes.status === 400 && shortPassRes.data.success === false,
      '8. Short password (< 6 chars) is rejected with HTTP 400'
    );

    // 9. Public registration cannot create Admin role (Privilege Escalation Protection)
    const adminAttemptRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Fake Admin',
        email: `fakeadmin_${timestamp}@acxiom.com`,
        password: 'AdminPassword123',
        role: 'Admin',
      }),
    });
    assert(
      adminAttemptRes.status === 400,
      '9. Public registration attempting to request Admin role is rejected with HTTP 400'
    );

    // 10. Public registration cannot create Manager role
    const mgrAttemptRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Fake Manager',
        email: `fakemgr_${timestamp}@acxiom.com`,
        password: 'MgrPassword123',
        role: 'Manager',
      }),
    });
    assert(
      mgrAttemptRes.status === 400,
      '10. Public registration attempting to request Manager role is rejected with HTTP 400'
    );

    // 11. Newly registered user can log in successfully
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: validEmail,
        password: validPassword,
      }),
    });
    assert(
      loginRes.status === 200 &&
        loginRes.data.success === true &&
        loginRes.data.data.user.email === validEmail,
      '11. Newly registered user can log in and receives JWT token'
    );

    // 12. Newly registered user's role in login response is Sales Executive
    assert(
      loginRes.data.data.user.role === 'Sales Executive',
      '12. Authenticated user profile confirms role is Sales Executive'
    );

    // 13. Newly registered user cannot access Admin-only /api/users endpoint
    const newExecToken = loginRes.data.data.token;
    const usersRes = await request('/users', {
      headers: { Authorization: `Bearer ${newExecToken}` },
    });
    assert(
      usersRes.status === 403,
      '13. Newly registered user is forbidden (HTTP 403) from accessing Admin user management'
    );

    // 14. Existing Admin, Manager, and Sales Executive accounts still log in normally
    const [adminCheck, mgrCheck, salesCheck] = await Promise.all([
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@acxiom.com', password: 'Admin@123' }),
      }),
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'manager@acxiom.com', password: 'Manager@123' }),
      }),
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'sales@acxiom.com', password: 'Sales@123' }),
      }),
    ]);
    assert(
      adminCheck.status === 200 && mgrCheck.status === 200 && salesCheck.status === 200,
      '14. Existing baseline accounts (Admin, Manager, Sales Executive) continue working without regression'
    );

  } catch (err) {
    console.error('Test suite error:', err);
    failedCount++;
  }

  console.log('\n====================================================');
  console.log(`REGISTRATION SUITE FINISHED: ${passedCount} Passed, ${failedCount} Failed`);
  console.log('====================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
