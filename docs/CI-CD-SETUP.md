# CI/CD Setup with Supabase GitHub Integration

This document explains how our CI/CD pipeline works with Supabase preview branches.

## Overview

Our CI/CD pipeline uses the Supabase GitHub Integration to automatically create preview environments for each pull request. This ensures that:

1. Each PR gets its own isolated Supabase instance
2. All database migrations, edge functions, and seed data are deployed to preview
3. Integration tests run against the preview environment
4. No accidental deployments to production from PRs

## Prerequisites

### 1. Supabase GitHub Integration (✅ Already Enabled)
- Installed via Supabase Dashboard → Settings → Integrations → GitHub
- Connected to repository: `zitrono/totalis-supabase`
- Production branch: `main`
- Branching enabled for automatic preview environments

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

### 1. `pre-preview.yml` - Static Validation
- **Triggers**: On every PR that changes Supabase files
- **Purpose**: Fast validation before creating preview environment
- **Checks**:
  - Migration naming convention
  - SQL syntax validation
  - TypeScript type checking for edge functions
  - No hardcoded secrets
  - Required files present

### 2. `validate.yml` - Full Validation
- **Triggers**: On PR changes to Supabase files
- **Purpose**: Comprehensive validation and testing
- **Jobs**:
  - Validate migrations
  - Validate edge functions
  - Validate config.toml
  - Run integration tests (against main project)

### 3. `preview-tests.yml` - Preview Environment Testing
- **Triggers**: On PR open/sync/reopen
- **Purpose**: Run tests against preview environment
- **Process**:
  1. Waits for Supabase Preview check to complete
  2. Automatically gets preview branch credentials
  3. Runs integration tests against preview
  4. Comments results on PR
- **Fallback**: If preview credentials can't be obtained, tests run against main project

### 4. `production.yml` - Production Deployment
- **Triggers**: On push to `main` branch
- **Purpose**: Deploy to production
- **Process**:
  1. Backup database (optional)
  2. Apply migrations
  3. Deploy edge functions
  4. Delete orphaned functions
  5. Run smoke tests

## How Preview Environments Work

1. **Automatic Creation**: When you open a PR, Supabase automatically:
   - Creates a new branch project
   - Applies all migrations
   - Seeds the database
   - Deploys edge functions
   - Comments on PR with preview details

2. **Automatic Testing**: The `preview-tests.yml` workflow:
   - Waits for preview to be ready
   - Gets credentials using a third-party action
   - Runs all integration tests
   - Reports results on PR

3. **Lifecycle**:
   - Preview environments pause after 5 minutes of inactivity
   - Auto-resume when accessed
   - Auto-delete 20 hours after PR is closed/merged

## Edge Function Deployment

### Preview Branches
- All edge functions are automatically deployed by Supabase
- No manual deployment needed
- Functions are available at: `https://{preview-id}.supabase.co/functions/v1/{function-name}`

### Production
- Functions deploy when PR is merged to main
- Orphaned functions (removed from Git) are automatically deleted
- Maintains Git as single source of truth

## Troubleshooting

### Preview Environment Not Created
- Check Supabase bot comment on PR
- Ensure GitHub Integration is enabled in Supabase Dashboard
- Verify repository connection in Supabase settings

### Tests Failing on Preview
- Check if preview is fully provisioned (wait 3-5 minutes)
- Verify edge functions are deployed
- Check for migration errors in Supabase Dashboard

### Can't Get Preview Credentials
- The third-party action might need updating
- Fallback to main project testing is automatic
- Check SUPABASE_ACCESS_TOKEN has correct permissions

## Future Improvements

1. **Native Supabase CLI Support**: When Supabase CLI adds support for getting branch API keys, we can remove the third-party action
2. **Faster Preview Creation**: Currently takes 3-5 minutes, may improve with Supabase updates
3. **Cost Optimization**: Consider auto-pausing preview branches after successful tests

## References

- [Supabase Branching Documentation](https://supabase.com/docs/guides/platform/branching)
- [GitHub Integration Guide](https://supabase.com/docs/guides/platform/github-integration)
- [CI/CD Examples](https://supabase.com/docs/guides/platform/github-actions)