# Backend Upgrade 2: Test Isolation Strategy for CI/CD

## Overview

This document outlines the revised implementation strategy using test isolation on existing Supabase infrastructure, eliminating the need for preview branches or local Supabase setup.

## Problem Summary

Preview branches in Supabase have fundamental limitations:
- Preview branches are not creating reliably
- Cannot modify auth.users schema when they do create
- External dependencies add complexity and points of failure
- Local Supabase requires additional setup and maintenance

## Solution Architecture

### Core Principles
- ✅ Use existing production/staging Supabase project
- ✅ Isolate test data using unique run identifiers
- ✅ Clean up test data after each run
- ✅ No additional infrastructure required
- ✅ Start testing immediately

## Implementation Plan

### Phase 1: Test Data Isolation (Immediate)

1. **Create Test Data Cleanup Function**
   ```sql
   -- supabase/migrations/20250603100000_feat_test_data_cleanup.sql
   CREATE OR REPLACE FUNCTION cleanup_test_data(run_id TEXT)
   RETURNS void AS $$
   BEGIN
     -- Delete test messages
     DELETE FROM messages 
     WHERE user_id IN (
       SELECT id FROM profiles 
       WHERE metadata->>'test_run_id' = run_id
     );
     
     -- Delete test recommendations
     DELETE FROM recommendations 
     WHERE user_id IN (
       SELECT id FROM profiles 
       WHERE metadata->>'test_run_id' = run_id
     );
     
     -- Delete test profile categories
     DELETE FROM profile_categories 
     WHERE user_id IN (
       SELECT id FROM profiles 
       WHERE metadata->>'test_run_id' = run_id
     );
     
     -- Delete test profiles
     DELETE FROM profiles 
     WHERE metadata->>'test_run_id' = run_id;
     
     -- Note: We cannot delete from auth.users via SQL
     -- These will be cleaned up periodically via admin API
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

2. **Update Test Helper for Isolated Test Users**
   ```typescript
   // src/tests/helpers/test-isolation.ts
   export class TestIsolation {
     private runId: string;
     private supabase: SupabaseClient;
     
     constructor(supabase: SupabaseClient) {
       this.supabase = supabase;
       // Use GitHub run ID or generate unique ID
       this.runId = process.env.GITHUB_RUN_ID || `local_${Date.now()}`;
     }
     
     async createTestUser(index: number) {
       const email = `test_${this.runId}_user${index}@totalis.app`;
       const password = 'Test123!@#';
       
       // Create user via auth
       const { data: authData, error: authError } = await this.supabase.auth.signUp({
         email,
         password,
         options: {
           data: {
             test_run_id: this.runId,
             is_test: true
           }
         }
       });
       
       if (authError) throw authError;
       
       // Ensure profile exists with test metadata
       const { error: profileError } = await this.supabase
         .from('profiles')
         .upsert({
           id: authData.user!.id,
           metadata: {
             test_run_id: this.runId,
             created_at: new Date().toISOString()
           }
         });
         
       if (profileError) throw profileError;
       
       return { email, password, userId: authData.user!.id };
     }
     
     async cleanup() {
       // Call cleanup function
       const { error } = await this.supabase
         .rpc('cleanup_test_data', { run_id: this.runId });
         
       if (error) {
         console.error('Cleanup failed:', error);
       }
     }
   }
   ```

### Phase 2: CI/CD Workflow Update (Week 1)

1. **Update GitHub Actions Workflow**
   ```yaml
   name: CI Tests
   on:
     pull_request:
     push:
       branches: [main]
   
   jobs:
     test:
       runs-on: ubuntu-latest
       env:
         # Use production/staging credentials
         SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
         SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
         GITHUB_RUN_ID: ${{ github.run_id }}
       
       steps:
         - uses: actions/checkout@v4
         
         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'npm'
         
         - name: Install dependencies
           run: npm ci
         
         - name: Run tests with isolation
           run: |
             echo "🧪 Running tests with isolation ID: $GITHUB_RUN_ID"
             npm test -- --coverage
         
         - name: Cleanup test data
           if: always()
           run: |
             node -e "
             const { createClient } = require('@supabase/supabase-js');
             const supabase = createClient(
               process.env.SUPABASE_URL,
               process.env.SUPABASE_SERVICE_ROLE_KEY
             );
             
             supabase.rpc('cleanup_test_data', { 
               run_id: process.env.GITHUB_RUN_ID 
             }).then(({ error }) => {
               if (error) console.error('Cleanup error:', error);
               else console.log('✅ Test data cleaned up');
             });
             "
   ```

2. **Add Periodic Cleanup Job**
   ```yaml
   name: Cleanup Old Test Data
   on:
     schedule:
       - cron: '0 2 * * *' # Daily at 2 AM
     workflow_dispatch:
   
   jobs:
     cleanup:
       runs-on: ubuntu-latest
       steps:
         - name: Cleanup auth.users test accounts
           run: |
             # Use admin API to delete test users older than 7 days
             node -e "
             const { createClient } = require('@supabase/supabase-js');
             const supabase = createClient(
               process.env.SUPABASE_URL,
               process.env.SUPABASE_SERVICE_ROLE_KEY,
               { auth: { persistSession: false } }
             );
             
             // Delete test users with email pattern
             const { data: users } = await supabase.auth.admin.listUsers();
             const testUsers = users.filter(u => 
               u.email.startsWith('test_') && 
               u.email.includes('_user') &&
               new Date(u.created_at) < new Date(Date.now() - 7*24*60*60*1000)
             );
             
             for (const user of testUsers) {
               await supabase.auth.admin.deleteUser(user.id);
               console.log('Deleted:', user.email);
             }
             "
   ```

### Phase 3: Test Migration (Week 1) ✅ IN PROGRESS

**Completed:**
- ✅ Test isolation infrastructure implemented
- ✅ Cleanup function deployed and working
- ✅ Email validation issues resolved (using @example.com)
- ✅ Test user creation via admin API working
- ✅ Automatic cleanup verified (9 records cleaned in test run)

**Migrated Tests:**
- ✅ `sdk-operations.test.ts` - Migrated to TestIsolation
- ✅ `edge-functions-remote.test.ts` - Migrated to TestIsolation
- ✅ `database-views.test.ts` - Migrated to TestIsolation
- ✅ `sdk-operations-isolated.test.ts` - Example implementation

**Remaining:**
- ⏳ Fix remaining test failures (auth token issues)
- ⏳ Migrate `sdk-operations.preview-safe.test.ts` or deprecate
- ⏳ Update CI workflows to use new pattern

1. **Update Existing Tests**
   ```typescript
   // Before
   describe('SDK Operations', () => {
     beforeAll(async () => {
       const { data } = await supabase.auth.signInWithPassword({
         email: 'test1@totalis.app',
         password: 'Test123!@#'
       });
     });
   });
   
   // After
   describe('SDK Operations', () => {
     let testIsolation: TestIsolation;
     let testUser: any;
     
     beforeAll(async () => {
       testIsolation = new TestIsolation(supabase);
       testUser = await testIsolation.createTestUser(1);
       
       await supabase.auth.signInWithPassword({
         email: testUser.email,
         password: testUser.password
       });
     });
     
     afterAll(async () => {
       await testIsolation.cleanup();
     });
   });
   ```

### Phase 4: Monitoring and Optimization (Week 2)

1. **Add Test Metrics**
   ```typescript
   // Track test data creation/cleanup
   interface TestMetrics {
     runId: string;
     usersCreated: number;
     dataCreated: number;
     cleanupSuccess: boolean;
     duration: number;
   }
   ```

2. **Monitor Database Growth**
   - Set up alerts for test data accumulation
   - Track cleanup job success rate
   - Monitor test user creation rate

## Benefits of This Approach

1. **Immediate Start**: No waiting for preview branches
2. **Real Environment**: Tests run against actual Supabase
3. **No Extra Cost**: Uses existing infrastructure
4. **Simple Setup**: Minimal changes to current workflow
5. **Reliable**: No external dependencies that can fail

## Migration Timeline

- **Day 1**: Implement test isolation helper and cleanup function
- **Day 2**: Update CI/CD workflows
- **Week 1**: Migrate all tests to use isolation
- **Week 2**: Add monitoring and optimize

## Success Metrics

1. **Test Reliability**: >95% pass rate
2. **Cleanup Efficiency**: <1% residual test data
3. **Performance**: No degradation vs current tests
4. **Cost**: $0 additional infrastructure

## Rollback Plan

If issues arise:
1. Tests can temporarily use hardcoded test users
2. Manual cleanup via Supabase dashboard
3. Revert to previous testing approach

## Next Steps

1. Create cleanup function migration
2. Implement TestIsolation helper
3. Update one test file as proof of concept
4. Roll out to all tests gradually
5. Add monitoring and alerts