# Common CI/CD Errors and Solutions

This document contains solutions for frequently encountered CI/CD errors.

## Table of Contents
- [Authentication Errors](#authentication-errors)
- [Migration Errors](#migration-errors)
- [Test Failures](#test-failures)
- [Preview Branch Issues](#preview-branch-issues)
- [Edge Function Errors](#edge-function-errors)

## Authentication Errors

### Error: "Invalid login credentials"
**Context**: Integration tests failing to authenticate with test users
**Causes**:
- Test users don't exist in the environment
- Auth configuration not properly set
- Service role key missing or invalid

**Solutions**:
1. Ensure test users are created in seed.sql
2. Check that anonymous auth is enabled in config.toml
3. Verify SUPABASE_SERVICE_KEY is set in GitHub secrets

### Error: "Database error creating new user"
**Context**: Auth admin API failing to create users
**Causes**:
- Auth trigger not properly set up
- Profile table constraints failing
- Database connection issues

**Solutions**:
1. Check that `on_auth_user_created` trigger exists
2. Verify profiles table allows inserts
3. Check database logs for specific constraint violations

## Migration Errors

### Error: "Invalid migration name"
**Context**: Fast static validation failing
**Format**: `YYYYMMDDHHMMSS_prefix_description.sql`
**Valid prefixes**: `feat_`, `fix_`, `refactor_`, `hf_`

**Solutions**:
1. Rename migration to follow convention
2. Use only lowercase and underscores in description
3. Keep description under 50 characters

### Error: "Migration failed to apply"
**Context**: Preview branch creation failing
**Causes**:
- SQL syntax errors
- Dependency issues
- Constraint violations

**Solutions**:
1. Test migration locally first
2. Check for missing `IF NOT EXISTS` clauses
3. Ensure proper migration order

## Test Failures

### Error: "Cannot read properties of undefined"
**Context**: Tests trying to use uninitialized clients
**Causes**:
- Service client not properly initialized
- Missing await on async setup
- Environment variables not set

**Solutions**:
1. Check test setup in beforeAll hooks
2. Verify all required env vars are present
3. Ensure proper client initialization

### Error: "Timeout waiting for preview branch"
**Context**: Preview tests timing out
**Causes**:
- Preview branch not created
- GitHub integration issues
- Supabase project not on Pro plan

**Solutions**:
1. Close and reopen PR to trigger creation
2. Check Supabase GitHub integration settings
3. Verify project has branching enabled

## Preview Branch Issues

### Error: "SKIPPED" status on Supabase Preview
**Context**: Preview branch check showing as skipped
**Causes**:
- No changes in supabase/ directory
- GitHub integration not configured
- Project doesn't support branching

**Solutions**:
1. Ensure changes exist in supabase/ folder
2. Reconnect GitHub integration in Supabase dashboard
3. Upgrade to Pro plan for branching support

## Edge Function Errors

### Error: "Edge function not found (404)"
**Context**: Edge function calls returning 404
**Causes**:
- Function not deployed to environment
- Wrong function name in URL
- Deployment failed silently

**Solutions**:
1. Check that function exists in supabase/functions/
2. Verify function name matches directory name
3. Check deployment logs for errors
4. Ensure function has index.ts file

### Error: "Missing required environment variable"
**Context**: Edge functions failing due to missing secrets
**Causes**:
- Secrets not set in GitHub
- Secrets not injected into preview
- Wrong variable names

**Solutions**:
1. Add all required secrets to GitHub repository settings
2. Check secret injection in preview workflow
3. Verify variable names match exactly

## General Troubleshooting

### Viewing Detailed Logs
```bash
# View failed job logs
gh run view --log-failed --job=<job-id>

# View specific workflow run
gh run view <run-id>

# Check PR status
gh pr checks <pr-number>
```

### Checking Supabase Preview Status
1. Visit the preview URL from the check details
2. Check Migrations tab for application errors
3. Review Functions tab for deployment status
4. Check Settings > Authentication for auth config

### Common Fixes
1. **Restart stuck workflows**: Cancel and re-run from Actions tab
2. **Clear preview branch**: Close PR, delete branch in Supabase, reopen PR
3. **Force migration rerun**: Add empty migration with comment change
4. **Reset test data**: Modify seed.sql to trigger fresh seeding