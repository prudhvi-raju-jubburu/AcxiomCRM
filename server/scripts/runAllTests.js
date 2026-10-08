/**
 * runAllTests.js
 * Comprehensive Master Test Runner for AcxiomCRM
 * Executes Phase 2, Phase 3, Phase 4, Phase 5, Registration Flow, and End-to-End Workflow suites.
 */

const { execSync } = require('child_process');
const path = require('path');

const testSuites = [
  { name: 'Phase 2: Authentication & RBAC', file: 'testPhase2.js' },
  { name: 'Phase 3: Customer & Lead Management', file: 'testPhase3.js' },
  { name: 'Phase 4: Opportunities & Follow-Ups', file: 'testPhase4.js' },
  { name: 'Phase 5: Dashboard & Analytics', file: 'testPhase5.js' },
  { name: 'Registration & Security Flow', file: 'testRegisterFlow.js' },
  { name: 'End-to-End Business Lifecycle Workflow', file: 'testEndToEndWorkflow.js' },
];

console.log('====================================================');
console.log('ACXIOM CRM - MASTER AUTOMATED TEST SUITE RUNNER');
console.log('====================================================\n');

let totalSuitesPassed = 0;
let totalSuitesFailed = 0;

testSuites.forEach((suite, index) => {
  console.log(`[${index + 1}/${testSuites.length}] Executing: ${suite.name} (${suite.file})...`);
  try {
    const output = execSync(`node ${path.join(__dirname, suite.file)}`, {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    
    // Extract passed/failed counts from stdout
    const passMatch = output.match(/(\d+)\s+Passed/i);
    const failMatch = output.match(/(\d+)\s+Failed/i);
    const passed = passMatch ? passMatch[1] : '?';
    const failed = failMatch ? failMatch[1] : '0';

    if (failed === '0') {
      console.log(`  --> PASSED (${passed} tests passed, 0 failed)\n`);
      totalSuitesPassed++;
    } else {
      console.error(`  --> FAILED (${passed} passed, ${failed} failed)\n`);
      totalSuitesFailed++;
    }
  } catch (err) {
    console.error(`  --> ERROR executing ${suite.file}:`, err.message);
    totalSuitesFailed++;
  }
});

console.log('====================================================');
console.log(`OVERALL SUMMARY: ${totalSuitesPassed} Suites Passed, ${totalSuitesFailed} Failed`);
console.log('====================================================');

if (totalSuitesFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
