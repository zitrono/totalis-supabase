# CI/CD Pipeline for Totalis Supabase

This directory contains GitHub Actions workflows for automated testing and deployment.

## Workflow: test-and-deploy.yml

### Overview
The pipeline runs on every push to main and on pull requests, executing:
1. Edge Function tests (Deno)
2. Integration tests (Jest/Node.js)
3. Automated deployment (main branch only)

### Jobs

#### 1. test-edge-functions
- Runs Deno tests for all Edge Functions
- Checks code formatting and linting
- Generates test coverage reports
- Uploads coverage to Codecov

#### 2. test-integration
- Sets up PostgreSQL service container
- Runs integration tests against Edge Functions
- Tests database connections and migrations

#### 3. deploy
- Only runs on main branch after tests pass
- Deploys Edge Functions to Supabase
- Applies database migrations

### Required Secrets

Set these in GitHub repository settings:

```bash
SUPABASE_ANON_KEY          # Public anonymous key
SUPABASE_SERVICE_ROLE_KEY  # Service role key for admin access
SUPABASE_ACCESS_TOKEN      # Personal access token for CLI
SUPABASE_PROJECT_ID        # Your Supabase project ID
```

### Local Testing

Run tests locally before pushing:

```bash
# Edge Function tests
cd supabase/functions
deno test --allow-all

# Integration tests
npm test

# Format check
deno fmt --check

# Lint
deno lint
```

### Coverage Reports

Coverage reports are automatically generated and uploaded to Codecov.
Add the Codecov badge to your README:

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/totalis-supabase/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/totalis-supabase)
```

### Deployment

Deployment happens automatically when:
1. Code is pushed to main branch
2. All tests pass
3. Required secrets are configured

Edge Functions are deployed with `--no-verify-jwt` flag for testing.
Remove this flag in production for security.

### Troubleshooting

**Tests failing locally but not in CI?**
- Check Node/Deno versions match CI
- Ensure environment variables are set
- Database might have different state

**Deployment failing?**
- Verify all secrets are set correctly
- Check Supabase project status
- Review deployment logs in Actions tab

**Coverage not updating?**
- Ensure tests generate lcov format
- Check Codecov token is valid
- Verify file paths in workflow