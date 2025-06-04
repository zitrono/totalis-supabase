# CI/CD Setup with Test Isolation Strategy

This document explains how our CI/CD pipeline works with unique test run IDs for complete test isolation.

## Overview

Our CI/CD pipeline uses a test isolation strategy to safely run tests against the production/staging environment. This ensures that:

1. Each test run gets a unique run ID for complete data isolation
2. All test data is automatically tagged and cleaned up after tests
3. Integration tests run directly against existing infrastructure
4. No external dependencies or preview environment creation delays

## Prerequisites

### 1. Test Isolation Environment (✅ Configured)
- Test data cleanup function deployed to production
- Unique run ID generation for CI/CD and local testing
- Automatic cleanup of test users and data after test completion
- Isolated test execution without affecting production data

### 2. Required GitHub Secrets
- `SUPABASE_ACCESS_TOKEN` - Personal access token from https://supabase.com/dashboard/account/tokens
- `SUPABASE_PROJECT_ID` - Your main project reference ID
- `SUPABASE_PROJECT_REF` - Same as PROJECT_ID (for compatibility)
- `SUPABASE_URL` - Main project API URL
- `SUPABASE_ANON_KEY` - Main project anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Main project service role key
- `SUPABASE_DB_PASSWORD` - Database password
- `DATABASE_URL` - Full database connection string
- `OPENAI_API_KEY` - For AI features in edge functions
- `GOOGLE_CLIENT_ID` - For Google OAuth
- `GOOGLE_CLIENT_SECRET` - For Google OAuth

## Workflow Files

### 1. `validate.yml` - Static Validation and Testing
- **Triggers**: On every PR that changes Supabase files
- **Purpose**: Fast validation and isolated testing
- **Checks**:
  - Migration naming convention
  - SQL syntax validation
  - TypeScript type checking for edge functions
  - No hardcoded secrets
  - Required files present
- **Testing**:
  - Run integration tests with unique run ID
  - Automatic cleanup of test data after completion

### 2. `ci-tests.yml` - Isolated Integration Testing
- **Triggers**: On PR changes and manually
- **Purpose**: Comprehensive testing with complete isolation
- **Process**:
  1. Generate unique test run ID (`gh_${GITHUB_RUN_ID}`)
  2. Create isolated test users with timestamp-based emails
  3. Run all integration tests against production/staging
  4. Automatic cleanup in `always()` block
  5. Comment results on PR with cleanup statistics

### 3. `production.yml` - Production Deployment
- **Triggers**: On push to `main` branch
- **Purpose**: Deploy to production
- **Process**:
  1. Apply migrations
  2. Deploy edge functions
  3. Delete orphaned functions
  4. Run smoke tests
  5. Trigger type generation and publishing

### 4. `cleanup-test-data.yml` - Scheduled Cleanup
- **Triggers**: Daily at 2 AM UTC
- **Purpose**: Remove orphaned test data older than 7 days
- **Process**:
  1. Identify test data older than 7 days
  2. Clean up database records
  3. Remove auth users
  4. Report cleanup statistics

## How Test Isolation Works

1. **Unique Run ID Generation**: Each test execution generates a unique identifier:
   - **CI/CD**: Uses GitHub run ID (`gh_${GITHUB_RUN_ID}`)
   - **Local**: Uses timestamp and random string (`local_${timestamp}_${random}`)

2. **Isolated Test Data**: All test data is tagged with the run ID:
   - Test users created with unique email addresses
   - Database records include `test_run_id` in metadata
   - Complete isolation between test runs

3. **Automatic Cleanup**: After test completion:
   - `cleanup_test_data(run_id)` removes all database records
   - Auth users are deleted via admin API
   - No test data pollution in production environment

## Edge Function Deployment

### Testing
- Edge functions are tested against the production environment
- Tests use isolated test data that is cleaned up automatically
- Function validation includes TypeScript compilation and syntax checks

### Production
- Functions deploy when PR is merged to main
- Orphaned functions (removed from Git) are automatically deleted
- Maintains Git as single source of truth
- Functions are available at: `https://qdqbrqnqttyjegiupvri.supabase.co/functions/v1/{function-name}`

## Troubleshooting

### Test Isolation Issues
- Check that `GITHUB_RUN_ID` environment variable is available in CI
- Verify `SUPABASE_SERVICE_ROLE_KEY` has admin permissions
- Ensure cleanup function `cleanup_test_data` exists in the database

### Tests Failing
- Check if all required environment variables are set
- Verify database connectivity and permissions
- Review test logs for specific error messages
- Ensure edge functions are deployed correctly

### Cleanup Not Working
- Verify service role key has admin API access
- Check if test users were created successfully
- Review cleanup function logs in Supabase Dashboard
- Ensure test data includes proper `test_run_id` metadata

## Future Improvements

1. **Performance Optimization**: Optimize test execution time and parallel test running
2. **Enhanced Monitoring**: Add metrics collection for test execution and cleanup effectiveness
3. **Smart Cleanup**: Implement more intelligent cleanup strategies based on test data age and usage patterns

## References

- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Supabase Admin API](https://supabase.com/docs/guides/auth/auth-admin)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Test Isolation Best Practices](https://supabase.com/docs/guides/testing)