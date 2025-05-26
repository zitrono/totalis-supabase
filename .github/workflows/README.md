# GitHub Actions CI/CD Configuration

## Required GitHub Secrets

The following secrets must be configured in your GitHub repository settings:

### For Testing (Remote Supabase)
- `SUPABASE_URL` - Your remote Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_ANON_KEY` - Your Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for test data management)

### For Deployment
- `SUPABASE_ACCESS_TOKEN` - Your personal Supabase access token (get from https://app.supabase.com/account/tokens)
- `SUPABASE_PROJECT_ID` - Your Supabase project reference ID

## Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the corresponding value from your Supabase project

## Remote Testing Policy

This CI/CD pipeline follows the remote-only database policy:
- All tests run against remote Supabase instance
- No local database or Docker containers are used
- Test data is isolated using metadata tracking
- Automatic cleanup after test runs

## Test Data Management

The pipeline includes:
- Pre-test monitoring of test data volume
- Immediate cleanup strategy during test runs
- Post-test cleanup of data older than 1 hour
- Cleanup runs even if tests fail (using `if: always()`)

## Workflow Overview

1. **test-edge-functions**: Tests Deno edge functions
2. **test-integration**: Runs integration tests against remote Supabase
3. **deploy**: Deploys to production (only on main branch)