# Remote Testing Guide

This guide explains how to run integration tests against a remote Supabase instance with proper test data isolation and cleanup.

## Overview

The remote testing system allows you to:
- Run tests against production-like Supabase environments
- Automatically identify and track test data
- Clean up test data after test runs
- Monitor test data accumulation
- Prevent pollution of production data

## Setup

### 1. Environment Variables

Configure your `.env` file with remote Supabase credentials:

```bash
# Remote Supabase instance
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Optional test configuration
TEST_MODE=remote              # auto-detected from URL
TEST_CLEANUP_STRATEGY=immediate # immediate, delayed, or manual
TEST_DATA_TTL=24               # hours before test data expires
```

### 2. Database Setup

Apply the migrations to set up the schema and test data tracking:

```bash
# Apply migrations using Supabase CLI
npx supabase db push -p "your-password"

# Or apply directly via SQL editor:
# 1. Run supabase/migrations/20240526000000_initial_schema.sql
# 2. Run supabase/migrations/20240526000001_test_data_tracking.sql
# 3. Run supabase/seed.sql
```

### 3. Deploy Edge Functions

Deploy all edge functions to your remote instance:

```bash
# Deploy all functions
npm run functions:deploy

# Or deploy individually
npx supabase functions deploy langflow-webhook
npx supabase functions deploy recommendations
npx supabase functions deploy checkin-start
npx supabase functions deploy checkin-process
npx supabase functions deploy analytics-summary
```

## Running Tests

### Basic Test Execution

```bash
# Run remote tests
npm run test:remote

# Run with specific test run ID
TEST_RUN_ID=my-test-123 npm run test:remote

# Run with manual cleanup (keeps test data)
TEST_CLEANUP_STRATEGY=manual npm run test:remote
```

### Test Data Management

```bash
# Monitor test data
npm run test:monitor

# Preview cleanup (dry run)
npm run test:cleanup:dry

# Clean up all test data older than 24 hours
npm run test:cleanup

# Clean up specific test run
npm run test:cleanup -- --test-run-id test_1234567_abc123

# Clean up data older than 1 hour
npm run test:cleanup -- --older-than "1 hour"
```

## How It Works

### Test Data Identification

1. **Metadata Field**: Test data is marked with metadata in each table:
   ```json
   {
     "test": true,
     "test_run_id": "test_1234567_abc123",
     "test_scenario": "edge-function-test",
     "test_created_at": "2024-05-26T12:00:00Z",
     "test_cleanup_after": "2024-05-27T12:00:00Z"
   }
   ```

2. **Headers**: Tests send special headers to edge functions:
   - `X-Test-Run-Id`: Unique identifier for the test run
   - `X-Test-Scenario`: Description of the test scenario

3. **User Identification**: Test users have emails matching `test_*@example.com`

### Cleanup Strategies

1. **Immediate**: Cleans up immediately after tests complete (default for remote)
2. **Delayed**: Keeps data for debugging, cleans up later
3. **Manual**: Never auto-cleans, requires manual cleanup

### Safety Mechanisms

1. **Email Pattern Validation**: Only deletes users with test email pattern
2. **Metadata Verification**: Only deletes records marked as test data
3. **Age Verification**: Only deletes data older than specified threshold
4. **Audit Trail**: All cleanup operations are logged in `test_cleanup_log`

## Test Data Monitoring

The monitoring script provides insights into:
- Current test data volume by table
- Age of oldest test data
- Recent test runs
- Cleanup history
- Recommendations for cleanup

```bash
npm run test:monitor
```

Example output:
```
📊 Test Data Monitor
===================
URL: https://your-project.supabase.co
Time: 2024-05-26T12:00:00.000Z

📈 Test Data by Table:
  messages              42 records
    └─ Oldest: 5/26/2024, 10:00:00 AM (2 hours ago)
  profiles              15 records
    └─ Oldest: 5/26/2024, 9:00:00 AM (3 hours ago)
  
  Total: 57 test records

🏃 Recent Test Runs:
  test_1716728400_abc123: 20 records (started: 2024-05-26T10:00:00Z)
  test_1716724800_def456: 15 records (started: 2024-05-26T09:00:00Z)

💡 Recommendations:
  ✅ Test data volume is low and manageable.
```

## Best Practices

1. **Use Unique Test Run IDs**: Let the system generate unique IDs or provide meaningful ones
2. **Clean Up Regularly**: Run cleanup after test sessions to prevent accumulation
3. **Monitor Test Data**: Check test data volume periodically
4. **Use Appropriate TTL**: Set TEST_DATA_TTL based on your debugging needs
5. **Dry Run First**: Always preview cleanup with `--dry-run` before executing

## Troubleshooting

### Tests Failing with 404

Edge functions might not be deployed. Deploy them with:
```bash
npm run functions:deploy
```

### Authentication Errors

Ensure your environment variables are correctly set:
- `SUPABASE_URL`: Your project URL
- `SUPABASE_ANON_KEY`: Anonymous key for client access
- `SUPABASE_SERVICE_KEY`: Service key for admin operations

### Cleanup Not Working

1. Check if test data has proper metadata
2. Verify age threshold (default 24 hours)
3. Check cleanup logs for errors
4. Use dry run to preview what would be deleted

### Test Data Accumulation

If test data accumulates:
1. Run `npm run test:monitor` to assess
2. Use `npm run test:cleanup -- --older-than "1 hour"`
3. Check if tests are using proper cleanup strategy

## Monitoring and Analytics

### Sentry Integration

Test data is handled specially in Sentry:

1. **Test Environment**: Test errors are tagged with `environment: test`
2. **Test Identification**: Test errors include `test_run_id` in context
3. **Production Safety**: Test errors are not sent to Sentry in production
4. **Error Context**: All test errors include test metadata for debugging

Example Sentry context for test errors:
```json
{
  "environment": "test",
  "test": true,
  "test_run_id": "test_1234567_abc123",
  "test_scenario": "edge-function-test"
}
```

### PostHog Analytics

Test events are isolated from production analytics:

1. **Event Prefix**: Test events are prefixed with `test_` (e.g., `test_function_checkin_start`)
2. **User ID**: Test users get ID `test_{test_run_id}` to avoid polluting real user data
3. **Properties**: All test events include `$test: true` and `$test_run_id`
4. **Filtering**: Easy to filter out test data in PostHog dashboards

Example PostHog event:
```json
{
  "event": "test_function_recommendations_success",
  "userId": "test_1234567_abc123",
  "properties": {
    "$test": true,
    "$test_run_id": "test_1234567_abc123",
    "$test_scenario": "edge-function-test",
    "recommendations_count": 3
  }
}
```

### Configuring Monitoring for Tests

Set these environment variables for proper test monitoring:

```bash
# Sentry
SENTRY_DSN=your-sentry-dsn
ENVIRONMENT=test  # or staging, production

# PostHog
POSTHOG_API_KEY=your-posthog-key
POSTHOG_API_HOST=https://app.posthog.com
```

### Filtering Test Data

#### In Sentry
- Filter by environment: `environment:test`
- Filter by test run: `test_run_id:test_1234567_abc123`
- Exclude test data: `environment:!test`

#### In PostHog
- Filter test events: `event contains "test_"`
- Filter by test property: `$test = true`
- Filter by test run: `$test_run_id = "test_1234567_abc123"`
- Exclude test users: `distinct_id !~ "test_"`

## Security Considerations

1. **Service Key**: Only use service key in test environment, never expose it
2. **Test Isolation**: Test data is clearly marked and isolated
3. **Cleanup Safety**: Multiple validation layers prevent production data deletion
4. **Audit Trail**: All operations are logged for accountability
5. **Monitoring Isolation**: Test data doesn't pollute production analytics

## Migration from Local Testing

To migrate existing tests:

1. Update environment variables to point to remote instance
2. Deploy edge functions
3. Run migrations on remote database
4. Update test imports to use new test helpers
5. Add test headers to edge function calls

The system automatically detects remote vs local based on the URL, so the same test code works in both environments.