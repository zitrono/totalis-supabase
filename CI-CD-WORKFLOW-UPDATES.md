# CI/CD Workflow Updates - Test Isolation Strategy

## Overview

This document summarizes the CI/CD workflow updates to implement the test isolation strategy, replacing the preview branch approach.

## Changes Made

### 1. Deprecated Workflows (Preview Branch Based)
- `preview-tests.yml` → Moved to `preview-tests.yml.old`
- `preview-tests-v2.yml` → Moved to `preview-tests-v2.yml.old`
- `pre-preview.yml` → Moved to `pre-preview.yml.old`

These workflows relied on Supabase preview branches which had fundamental limitations (no auth schema modifications, unreliable creation).

### 2. Updated Workflows

#### `validate.yml` - Enhanced with Test Isolation
- Added test isolation environment variables
- Runs tests directly against production/staging with `GITHUB_RUN_ID`
- Includes automatic cleanup step after tests
- Cleans up both database records and auth users

#### `ci-tests.yml` - Test Isolation Implementation
- Uses unique run IDs for test isolation
- Creates isolated test users with timestamp-based emails
- Automatic cleanup in `always()` block
- Enhanced PR comments with cleanup statistics

#### `generate-publish-types.yml` - No Changes Needed
- Already working correctly
- Generates types from production schema
- Publishes to pub.dev automatically

#### `production.yml` - No Changes Needed
- Deployment workflow remains unchanged
- Applies migrations, deploys functions, pushes config

### 3. New Workflows

#### `main-ci.yml` - Orchestrator Workflow
- Combines validation, testing, and deployment
- Uses workflow calls for modularity
- Runs tests on PRs, deploys on main branch
- Triggers type generation after deployment

### 4. Test Isolation Implementation

#### Key Components:
1. **Unique Run IDs**: `gh_${GITHUB_RUN_ID}` for CI, `local_${timestamp}_${random}` for local
2. **Test User Pattern**: `test${timestamp}${random}${index}@example.com`
3. **Metadata Tagging**: All test data includes `test_run_id` in metadata
4. **Cleanup Function**: `cleanup_test_data(run_id)` removes all test data
5. **Auth Cleanup**: Admin API deletes test users after database cleanup

#### Environment Variables:
```yaml
GITHUB_RUN_ID: ${{ github.run_id }}
SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### 5. Benefits of New Approach

1. **No External Dependencies**: No preview branches or Docker required
2. **Immediate Testing**: Tests run against existing infrastructure
3. **Complete Isolation**: Each test run has unique identifiers
4. **Automatic Cleanup**: No test data pollution
5. **Reliable CI/CD**: No flaky preview branch creation

### 6. Migration Checklist

- [x] Deprecate preview branch workflows
- [x] Update validate.yml with test isolation
- [x] Ensure ci-tests.yml uses isolation
- [x] Create orchestrator main-ci.yml
- [x] Verify types generation workflow
- [x] Document changes

### 7. Usage

#### For Pull Requests:
1. Tests automatically run with isolation
2. Unique test users created per run
3. All data cleaned up after tests
4. Results commented on PR

#### For Local Development:
```bash
# Tests will use local isolation
npm test

# Run specific test file
npm test -- src/tests/integration/sdk-operations-isolated.test.ts
```

#### For Production Deployment:
- Merge to main triggers automatic deployment
- Types package generated and published after deployment

### 8. Monitoring

The scheduled cleanup job (`cleanup-test-data.yml`) runs daily to remove any orphaned test data older than 7 days.

## Next Steps

1. Monitor test execution in CI/CD
2. Track cleanup effectiveness
3. Optimize test performance if needed
4. Add metrics collection (optional)