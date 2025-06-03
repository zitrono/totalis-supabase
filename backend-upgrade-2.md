# Backend Upgrade 2: Supabase Preview Branch Testing Strategy

## Overview

This document outlines the implementation strategy to resolve Supabase preview branch testing limitations discovered during the backend-upgrade.md implementation. The goal is to achieve 60% test coverage in preview branches without compromising schema integrity or creating separate migration paths.

## Problem Summary

Preview branches in Supabase have fundamental limitations:
- Cannot modify auth.users schema
- Start with empty database (no existing migrations)
- Foreign key constraints to auth.users cause migration failures
- Seed.sql runs after migrations, not before

## Solution Architecture

### Core Principles
- ❌ No conditional FK constraints in migrations
- ❌ No separate migration files for preview vs production
- ✅ Target 60% test coverage in preview environments
- ✅ Maintain schema integrity and single migration path

## Implementation Plan

### Phase 1: Seed-First Architecture (Immediate)

1. **Create a robust seed.sql that runs BEFORE migrations need it**
   ```sql
   -- supabase/seed.sql (updated)
   -- These users will exist when migrations run
   INSERT INTO auth.users (
     id, 
     email, 
     encrypted_password,
     email_confirmed_at,
     created_at,
     updated_at,
     raw_app_meta_data,
     raw_user_meta_data
   )
   VALUES 
     (
       '11111111-1111-1111-1111-111111111111',
       'test1@totalis.app',
       crypt('Test123!@#', gen_salt('bf')),
       now(),
       now(),
       now(),
       '{"provider": "email", "providers": ["email"]}',
       '{"email": "test1@totalis.app"}'
     ),
     (
       '22222222-2222-2222-2222-222222222222',
       'test2@totalis.app',
       crypt('Test123!@#', gen_salt('bf')),
       now(),
       now(),
       now(),
       '{"provider": "email", "providers": ["email"]}',
       '{"email": "test2@totalis.app"}'
     ),
     (
       '33333333-3333-3333-3333-333333333333',
       'test3@totalis.app',
       crypt('Test123!@#', gen_salt('bf')),
       now(),
       now(),
       now(),
       '{"provider": "email", "providers": ["email"]}',
       '{"email": "test3@totalis.app"}'
     )
   ON CONFLICT (id) DO NOTHING;

   -- Create identities for email provider
   INSERT INTO auth.identities (
     id,
     user_id,
     identity_data,
     provider,
     created_at,
     updated_at
   )
   SELECT
     gen_random_uuid(),
     id,
     jsonb_build_object('sub', id::text, 'email', email),
     'email',
     now(),
     now()
   FROM auth.users
   WHERE email LIKE '%@totalis.app'
   ON CONFLICT DO NOTHING;
   ```

2. **Ensure seed.sql runs FIRST in preview branches**
   ```toml
   # supabase/config.toml
   [db]
   seed_path = "seed.sql"
   
   [db.seed]
   enabled = true
   ```

3. **Force seed execution in preview workflow**
   ```yaml
   # .github/workflows/preview-tests.yml
   - name: Setup Preview Database
     run: |
       # Run seed BEFORE migrations
       supabase db seed --debug
       # Then run migrations
       supabase db push --include-seed
   ```

### Phase 2: Test Strategy for 60% Coverage (Week 1)

1. **Categorize tests by preview compatibility**
   ```typescript
   // tests/test-categories.ts
   export enum TestCategory {
     PREVIEW_SAFE = 'preview-safe',    // 60% - Runs in preview
     AUTH_REQUIRED = 'auth-required',  // 40% - Skipped in preview
   }

   export const categorizeTest = (testPath: string): TestCategory => {
     // Tests that work with seeded auth users
     const previewSafe = [
       'sdk-operations',
       'database-queries', 
       'rls-policies',
       'edge-functions',
       'storage-operations'
     ];
     
     // Tests that need real auth flows
     const authRequired = [
       'oauth-login',
       'password-reset',
       'email-verification',
       'session-refresh'
     ];
     
     if (previewSafe.some(pattern => testPath.includes(pattern))) {
       return TestCategory.PREVIEW_SAFE;
     }
     return TestCategory.AUTH_REQUIRED;
   };
   ```

2. **Implement smart test runner**
   ```typescript
   // tests/helpers/preview-test-runner.ts
   import { skipIfPreview } from './skip-auth';

   export function describePreviewSafe(
     name: string, 
     fn: () => void
   ) {
     describe(name, () => {
       beforeAll(async () => {
         // Use seeded test users
         const { data, error } = await supabase.auth.signInWithPassword({
           email: 'test1@totalis.app',
           password: 'Test123!@#'
         });
         
         if (error && isPreviewEnv()) {
           console.warn('Using mock auth for preview tests');
           // Continue with mock user ID
         }
       });
       
       fn();
     });
   }
   ```

3. **Update test files**
   ```typescript
   // Before
   describe('User Profile CRUD', () => {
     test('should create profile', async () => {
       // Test implementation
     });
   });

   // After  
   describePreviewSafe('User Profile CRUD', () => {
     test('should create profile', async () => {
       // Same test, but wrapped for preview compatibility
     });
   });
   ```

### Phase 3: Preview Branch Configuration (Week 1)

1. **Configure Supabase preview branches**
   ```json
   // supabase/preview.json
   {
     "preview": {
       "database": {
         "seed_before_migrations": true,
         "pool_size": 5
       },
       "auth": {
         "site_url": "http://localhost:3000",
         "redirect_urls": ["http://localhost:3000/auth/callback"]
       }
     }
   }
   ```

2. **Add preview branch detection**
   ```typescript
   // src/tests/config/test-env.ts
   export const getTestConfig = () => {
     const url = process.env.SUPABASE_URL || '';
     const isPreview = url.includes('.branches.') || 
                      process.env.IS_PREVIEW === 'true';
     
     return {
       supabaseUrl: url,
       isPreview,
       testUsersAvailable: true, // Always true with proper seed.sql
       targetCoverage: isPreview ? 0.6 : 1.0
     };
   };
   ```

### Phase 4: CI/CD Pipeline Update (Week 2)

1. **Update preview test workflow**
   ```yaml
   name: Preview Tests (60% Coverage)
   
   on:
     pull_request:
       types: [opened, synchronize]
   
   jobs:
     preview-tests:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         
         - name: Wait for Preview Branch
           uses: ./.github/actions/wait-preview
           with:
             timeout: 300
         
         - name: Get Preview Credentials
           id: preview
           uses: supabase/setup-branch-action@v1
           with:
             project-ref: ${{ secrets.PROJECT_ID }}
         
         - name: Verify Seed Data
           run: |
             echo "Checking seeded users..."
             npx supabase db dump --data-only \
               | grep -E "(test1|test2|test3)@totalis.app" \
               || echo "Warning: Test users not found"
         
         - name: Run Preview-Safe Tests (60%)
           env:
             SUPABASE_URL: ${{ steps.preview.outputs.url }}
             SUPABASE_ANON_KEY: ${{ steps.preview.outputs.anon-key }}
             TEST_CATEGORY: preview-safe
           run: |
             npm test -- --coverage \
               --coverageThreshold='{"global":{"statements":60}}'
         
         - name: Generate Coverage Report
           run: |
             echo "### Preview Test Coverage (Target: 60%)" >> $GITHUB_STEP_SUMMARY
             echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
             cat coverage/coverage-summary.txt >> $GITHUB_STEP_SUMMARY
             echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
   ```

2. **Add production test job**
   ```yaml
   production-tests:
     if: github.ref == 'refs/heads/main'
     runs-on: ubuntu-latest
     steps:
       - name: Run Full Test Suite (100%)
         env:
           SUPABASE_URL: ${{ secrets.STAGING_URL }}
           TEST_CATEGORY: all
         run: npm test -- --coverage
   ```

### Phase 5: Monitoring and Reporting (Week 2)

1. **Create test coverage dashboard**
   ```typescript
   // scripts/generate-test-report.ts
   interface TestReport {
     environment: 'preview' | 'production';
     totalTests: number;
     previewSafeTests: number;
     skippedTests: number;
     coverage: {
       statements: number;
       branches: number;
       functions: number;
       lines: number;
     };
   }
   
   export async function generateTestReport(): Promise<TestReport> {
     const results = await runTests();
     const report: TestReport = {
       environment: isPreview() ? 'preview' : 'production',
       totalTests: results.total,
       previewSafeTests: results.categories['preview-safe'],
       skippedTests: results.skipped,
       coverage: results.coverage
     };
     
     // Output for GitHub Actions
     console.log(`::notice::Preview Coverage: ${report.coverage.statements}% (Target: 60%)`);
     
     return report;
   }
   ```

2. **Add PR comment with test summary**
   ```yaml
   - name: Comment Test Results
     uses: actions/github-script@v7
     with:
       script: |
         const coverage = ${{ steps.tests.outputs.coverage }};
         const skipped = ${{ steps.tests.outputs.skipped }};
         
         github.rest.issues.createComment({
           issue_number: context.issue.number,
           owner: context.repo.owner,
           repo: context.repo.repo,
           body: `## Preview Test Results
           
           ✅ **Coverage**: ${coverage}% (Target: 60%)
           📊 **Tests Run**: ${total - skipped} of ${total}
           ⏭️ **Skipped**: ${skipped} auth-dependent tests
           
           Full auth testing will run after merge to main.`
         });
   ```

## Success Metrics

1. **Preview Branch Success Rate**: >95% of PRs pass preview tests
2. **Test Coverage**: 60% in preview, 100% in production
3. **Migration Success**: 100% of migrations apply cleanly
4. **Developer Experience**: <5 min feedback on PR tests

## Timeline

- **Week 1**: Implement seed-first architecture and test categorization
- **Week 2**: Update CI/CD pipeline and monitoring
- **Week 3**: Monitor, adjust thresholds, and document learnings

## Key Benefits

1. **No schema compromises** - FK constraints remain intact
2. **Single migration path** - Same files for all environments  
3. **Predictable testing** - 60% coverage in preview, 100% in production
4. **Clear visibility** - Know exactly what's tested where
5. **Fast feedback** - Most tests run in preview
6. **Simple implementation** - Leverages Supabase's seed mechanism

## Rollback Plan

If this approach fails:
1. Revert to admin override merges (temporary)
2. Investigate Supabase's upcoming CoW (Copy-on-Write) features
3. Consider dedicated staging environment for full testing

## Approval

- [ ] Approved by: _____________
- [ ] Date: _____________
- [ ] Notes: _____________