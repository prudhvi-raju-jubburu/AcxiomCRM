/**
 * Phase 2 Automated API Verification Script
 * Tests all authentication, authorization, lockout, and user management endpoints.
 */
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 2 AUTOMATED TEST SUITE');
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
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    assert(health.success === true && health.data.database.connected === true, 'Server & MongoDB are connected and healthy');

    // 2. Authentication: Login with valid Admin credentials
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acxiom.com', password: 'Admin@123' }),
    });
    const adminLogin = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && !!adminLogin.data?.token, 'Admin login succeeds and returns JWT token');
    assert(!adminLogin.data?.user?.password, 'User password is NOT returned in login response');
    const adminToken = adminLogin.data?.token;

    // 3. Authentication: Login with Manager and Sales Executive credentials
    const managerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@acxiom.com', password: 'Manager@123' }),
    });
    const managerLogin = await managerLoginRes.json();
    assert(managerLoginRes.status === 200, 'Manager login succeeds');
    const managerToken = managerLogin.data?.token;

    const salesLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sales@acxiom.com', password: 'Sales@123' }),
    });
    const salesLogin = await salesLoginRes.json();
    assert(salesLoginRes.status === 200, 'Sales Executive login succeeds');
    const salesToken = salesLogin.data?.token;

    // 4. Authentication: Non-existent user
    const noUserRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost@acxiom.com', password: 'Password@123' }),
    });
    assert(noUserRes.status === 401, 'Non-existent user receives HTTP 401');

    // 5. Authentication: Wrong password
    const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acxiom.com', password: 'WrongPassword' }),
    });
    assert(wrongPassRes.status === 401, 'Wrong password receives HTTP 401');

    // 6. Authentication: GET /api/auth/me (Protected route)
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const me = await meRes.json();
    assert(meRes.status === 200 && me.data.user.email === 'admin@acxiom.com', 'GET /api/auth/me returns authenticated user profile');
    assert(!me.data.user.password, 'GET /api/auth/me does not expose password');

    // 7. Security: Request without token rejected
    const noTokenRes = await fetch(`${BASE_URL}/auth/me`);
    assert(noTokenRes.status === 401, 'Unauthenticated request to protected route returns HTTP 401');

    // 8. Authentication: Registration
    const testRegEmail = `testuser_${Date.now()}@acxiom.com`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Candidate',
        email: testRegEmail,
        password: 'Password@123',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.data.user.role === 'Sales Executive', 'Registration creates user with default Sales Executive role');

    // 9. Security: Public self-registration cannot request Admin role
    const sneakyRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker',
        email: `hacker_${Date.now()}@acxiom.com`,
        password: 'Password@123',
        role: 'Admin',
      }),
    });
    assert(sneakyRegRes.status === 400, 'Public registration requesting Admin role is rejected with HTTP 400');

    // 10. Security: Duplicate email registration rejected
    const dupRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate',
        email: testRegEmail,
        password: 'Password@123',
      }),
    });
    assert(dupRegRes.status === 409, 'Duplicate email registration returns HTTP 409 Conflict');

    // 11. Authorization: Admin can access /api/users
    const adminUsersRes = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminUsersRes.status === 200, 'Admin can access GET /api/users');

    // 12. Authorization: Manager & Sales Executive CANNOT access /api/users (HTTP 403)
    const managerUsersRes = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert(managerUsersRes.status === 403, 'Manager is forbidden (HTTP 403) from accessing /api/users');

    const salesUsersRes = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${salesToken}` },
    });
    assert(salesUsersRes.status === 403, 'Sales Executive is forbidden (HTTP 403) from accessing /api/users');

    // 13. User Management: Admin creates user
    const newUserEmail = `created_by_admin_${Date.now()}@acxiom.com`;
    const adminCreateRes = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'New Sales Rep',
        email: newUserEmail,
        password: 'RepPassword@123',
        role: 'Sales Executive',
      }),
    });
    const adminCreateData = await adminCreateRes.json();
    assert(adminCreateRes.status === 201, 'Admin can create new user with specified role');
    const createdUserId = adminCreateData.data._id;

    // 14. User Management: Admin updates user
    const adminUpdateRes = await fetch(`${BASE_URL}/users/${createdUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Updated Sales Rep Name',
        role: 'Manager',
      }),
    });
    const adminUpdateData = await adminUpdateRes.json();
    assert(adminUpdateRes.status === 200 && adminUpdateData.data.name === 'Updated Sales Rep Name' && adminUpdateData.data.role === 'Manager', 'Admin can update user details and role');

    // 15. User Management: Admin toggles user status (deactivate)
    const toggleRes = await fetch(`${BASE_URL}/users/${createdUserId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const toggleData = await toggleRes.json();
    assert(toggleRes.status === 200 && toggleData.data.isActive === false, 'Admin can deactivate user');

    // 16. Security: Deactivated user CANNOT log in
    const deactLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newUserEmail, password: 'RepPassword@123' }),
    });
    assert(deactLoginRes.status === 403, 'Deactivated user cannot log in (HTTP 403)');

    // 17. Security: Temporary Account Lockout test
    // Create a dedicated user for lockout testing
    const lockoutEmail = `lockout_test_${Date.now()}@acxiom.com`;
    await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Lockout Test',
        email: lockoutEmail,
        password: 'ValidPassword123',
        role: 'Sales Executive',
      }),
    });

    // Send 5 consecutive failed passwords
    for (let i = 1; i <= 5; i++) {
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lockoutEmail, password: 'WrongPassword' }),
      });
    }

    // Now even with the CORRECT password, login must be blocked due to lockout
    const lockedRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: lockoutEmail, password: 'ValidPassword123' }),
    });
    const lockedData = await lockedRes.json();
    assert(lockedRes.status === 403 && lockedData.message.includes('locked'), 'Account is locked after 5 consecutive failed attempts (HTTP 403)');

    // 18. Authentication: Logout acknowledgment
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, { method: 'POST' });
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns HTTP 200');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST SUITE FINISHED: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
