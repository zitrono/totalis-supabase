# CI/CD Lessons Learned: Supabase Preview Branches

## Executive Summary

After extensive research and testing, we've identified critical lessons about Supabase preview branches and their limitations. This document captures our findings and provides actionable guidance for teams implementing CI/CD with Supabase.

## Key Discoveries

### 1. Preview Branch Requirements

**Official Requirements:**
- Supabase project must be on Pro Plan or above
- GitHub integration must be properly connected
- Repository must contain a `supabase` directory with migrations
- Preview branches are created automatically when PRs are opened

**Reality Check:**
- Preview branch creation is not always automatic
- External contributor PRs don't support preview branches
- GitHub webhook bugs can prevent proper PR association

### 2. The auth.users Challenge

**The Problem:**
- Preview branches cannot modify the `auth` schema
- Test users cannot be created via migrations
- Foreign key constraints to `auth.users` cause migration failures

**Community Solutions:**
1. **Seed-First Architecture**: Place test user creation in `seed.sql`
2. **Import Table Pattern**: Create staging table, then bulk insert
3. **Basejump Test Helpers**: Use community libraries for test user management

### 3. Seed File Execution

**Official Documentation States:**
- `seed.sql` runs automatically when preview branch is created
- Seeding happens once, during branch creation
- File must be at `./supabase/seed.sql`

**Our Experience:**
- Seed execution timing is critical
- Cannot rely on seed data being available during migrations
- Re-seeding requires deleting and recreating the preview branch

## Technical Limitations Discovered

### 1. Migration Order Dependencies
```sql
-- This FAILS in preview branches
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY
);

-- This WORKS but compromises integrity
CREATE TABLE profiles (
  id UUID PRIMARY KEY
);
```

### 2. GitHub Integration Issues
- Webhook creation via migrations fails in preview branches
- Branch status remains "undefined" indefinitely
- No clear error messages when branch creation fails

### 3. Environment Detection
- No reliable way to detect preview environment from SQL
- `current_database()` doesn't indicate preview status
- Must rely on environment variables in application code

## Successful Patterns

### 1. Deterministic Test User IDs
```sql
-- Use fixed UUIDs for test users
INSERT INTO auth.users (id, email, ...) VALUES
  ('11111111-1111-1111-1111-111111111111', 'test1@example.com', ...),
  ('22222222-2222-2222-2222-222222222222', 'test2@example.com', ...);
```

### 2. Test Categorization
- **Preview-Safe Tests (60%)**: Tests that work with seeded data
- **Auth-Required Tests (40%)**: Tests needing real auth flows
- Run appropriate tests in appropriate environments

### 3. Conditional Test Execution
```typescript
if (isPreviewEnvironment()) {
  test.skip('OAuth login flow', ...);
}
```

## Failed Approaches

### 1. ❌ Creating Test Users in Migrations
- Cannot INSERT into auth.users from migrations
- SECURITY DEFINER functions don't bypass restriction
- RPC functions cannot modify auth schema

### 2. ❌ Conditional Foreign Keys
- Attempting IF EXISTS checks for auth.users
- Dynamic constraint addition based on environment
- Complex DO blocks with exception handling

### 3. ❌ Mock Authentication Layers
- Creating shadow user tables
- JWT generation in Edge Functions
- Bypassing Supabase auth entirely

## Recommended Architecture

### 1. Embrace the Limitations
- Accept that preview branches have constraints
- Design tests to work within these constraints
- Use production/staging for full integration tests

### 2. Seed-First Development
```yaml
# CI/CD workflow
- name: Force seed execution
  run: supabase db seed --debug
  
- name: Run migrations
  run: supabase db push
```

### 3. Multi-Stage Testing Pipeline
```
Preview Branch (60% coverage) → Staging (90% coverage) → Production (100% monitoring)
```

## Configuration Gotchas

### 1. Required GitHub Secrets
- `SUPABASE_ACCESS_TOKEN`: Personal access token
- `SUPABASE_PROJECT_ID`: Project reference
- `SUPABASE_DB_PASSWORD`: Database password

### 2. Branch Protection Settings
- Enable "Supabase Preview" as required check
- Prevents merging when migrations fail
- Catches issues before production

### 3. Monorepo Configuration
```toml
[branching]
supabase_directory = "backend/supabase"
```

## Community Resources

### 1. Basejump Test Helpers
- Simplified test user creation
- RLS policy testing utilities
- Authentication mocking

### 2. GitHub Gists
- [Seed Users Script](https://gist.github.com/khattaksd/4e8f4c89f4e928a2ecaad56d4a17ecd1)
- Handles auth.users and auth.identities
- Maintains referential integrity

### 3. Stack Overflow Solutions
- Import table pattern for bulk user creation
- Workarounds for provider_id requirements
- Environment-specific seeding strategies

## Future Considerations

### 1. Upcoming Features
- Supabase is developing better preview branch support
- Copy-on-Write functionality for production snapshots
- Declarative auth configuration in config.toml

### 2. Alternative Approaches
- Local Supabase for true integration testing
- Dedicated test projects with real auth
- GitHub Actions matrix testing

### 3. When to Skip Preview Branches
- Complex auth flows
- Multi-service integration tests
- Performance benchmarking
- Data migration testing

## Conclusion

Preview branches are powerful but limited. Success requires:
1. Understanding and accepting the limitations
2. Designing tests that work within constraints
3. Using appropriate environments for different test types
4. Leveraging community solutions and patterns

The key insight: **Don't fight the platform, work with it.**

## Action Items

1. ✅ Implement seed-first architecture
2. ✅ Categorize tests by environment compatibility
3. ✅ Create multi-stage CI/CD pipeline
4. ⏳ Monitor Supabase roadmap for improvements
5. ⏳ Contribute back to community with our learnings

---

*Last Updated: 2025-06-03*  
*Based on: Supabase CLI v2.23.8, GitHub Actions, Preview Branches (Pro Plan)*