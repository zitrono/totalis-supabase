#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface TestReport {
  environment: 'preview' | 'production';
  timestamp: string;
  totalTests: number;
  previewSafeTests: number;
  authRequiredTests: number;
  skippedTests: number;
  coverage: {
    statements: { total: number; covered: number; pct: number };
    branches: { total: number; covered: number; pct: number };
    functions: { total: number; covered: number; pct: number };
    lines: { total: number; covered: number; pct: number };
  };
  testCategories: {
    [category: string]: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    };
  };
}

async function generateTestReport(): Promise<TestReport> {
  const isPreview = process.env.IS_PREVIEW === 'true' || 
                   process.env.ENVIRONMENT === 'preview';

  console.log('🧪 Generating test report...');
  console.log(`📍 Environment: ${isPreview ? 'Preview' : 'Production'}`);

  // Count test files by category
  const testDir = path.join(__dirname, '../src/tests');
  let previewSafeCount = 0;
  let authRequiredCount = 0;

  function countTests(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        countTests(fullPath);
      } else if (file.endsWith('.test.ts')) {
        if (file.includes('preview-safe') || file.includes('preview.safe')) {
          previewSafeCount++;
        } else if (file.includes('auth') || file.includes('oauth')) {
          authRequiredCount++;
        } else {
          // Default to auth-required for safety
          authRequiredCount++;
        }
      }
    }
  }

  countTests(testDir);

  // Get coverage data if available
  let coverage = {
    statements: { total: 0, covered: 0, pct: 0 },
    branches: { total: 0, covered: 0, pct: 0 },
    functions: { total: 0, covered: 0, pct: 0 },
    lines: { total: 0, covered: 0, pct: 0 }
  };

  const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');
  if (fs.existsSync(coveragePath)) {
    try {
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      coverage = coverageData.total;
    } catch (e) {
      console.warn('⚠️  Could not parse coverage data');
    }
  }

  // Calculate test metrics
  const totalTests = previewSafeCount + authRequiredCount;
  const skippedInPreview = isPreview ? authRequiredCount : 0;

  const report: TestReport = {
    environment: isPreview ? 'preview' : 'production',
    timestamp: new Date().toISOString(),
    totalTests,
    previewSafeTests: previewSafeCount,
    authRequiredTests: authRequiredCount,
    skippedTests: skippedInPreview,
    coverage,
    testCategories: {
      'sdk-operations': { total: 0, passed: 0, failed: 0, skipped: 0 },
      'edge-functions': { total: 0, passed: 0, failed: 0, skipped: 0 },
      'rls-policies': { total: 0, passed: 0, failed: 0, skipped: 0 },
      'auth-flows': { total: 0, passed: 0, failed: 0, skipped: isPreview ? authRequiredCount : 0 }
    }
  };

  // Output report
  console.log('\n📊 Test Report Summary:');
  console.log('=' .repeat(50));
  console.log(`Environment: ${report.environment}`);
  console.log(`Total Tests: ${report.totalTests}`);
  console.log(`Preview-Safe: ${report.previewSafeTests} (${(report.previewSafeTests / report.totalTests * 100).toFixed(1)}%)`);
  console.log(`Auth-Required: ${report.authRequiredTests} (${(report.authRequiredTests / report.totalTests * 100).toFixed(1)}%)`);
  
  if (isPreview) {
    console.log(`\n⏭️  Skipped in Preview: ${report.skippedTests} tests`);
  }

  console.log('\n📈 Coverage:');
  console.log(`Statements: ${coverage.statements.pct.toFixed(1)}% (${coverage.statements.covered}/${coverage.statements.total})`);
  console.log(`Branches: ${coverage.branches.pct.toFixed(1)}% (${coverage.branches.covered}/${coverage.branches.total})`);
  console.log(`Functions: ${coverage.functions.pct.toFixed(1)}% (${coverage.functions.covered}/${coverage.functions.total})`);
  console.log(`Lines: ${coverage.lines.pct.toFixed(1)}% (${coverage.lines.covered}/${coverage.lines.total})`);

  // Target validation
  const targetCoverage = isPreview ? 60 : 100;
  const meetsTarget = coverage.statements.pct >= targetCoverage;

  console.log(`\n🎯 Target Coverage: ${targetCoverage}%`);
  console.log(`✅ Meets Target: ${meetsTarget ? 'YES' : 'NO'}`);

  // GitHub Actions output
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::notice::Preview Coverage: ${coverage.statements.pct.toFixed(1)}% (Target: ${targetCoverage}%)`);
    
    // Set outputs
    console.log(`::set-output name=coverage::${coverage.statements.pct}`);
    console.log(`::set-output name=skipped::${report.skippedTests}`);
    console.log(`::set-output name=total::${report.totalTests}`);
  }

  // Write report to file
  const reportPath = path.join(__dirname, '../test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Report saved to: ${reportPath}`);

  return report;
}

// Run if called directly
if (require.main === module) {
  generateTestReport().catch(console.error);
}

export { generateTestReport, TestReport };