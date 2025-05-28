# CI/CD Setup Lessons Learned

## 1. **TypeScript in Deno Edge Functions**
- Deno requires explicit type references: `/// <reference lib="deno.ns" />` and `/// <reference lib="dom" />`
- Must be at the TOP of each entry point file (index.ts)
- Error handling needs proper type guards: `error instanceof Error ? error.message : String(error)`
- Headers.entries() might not be available - use `[...req.headers]` instead
- Variables defined in try blocks aren't accessible in catch blocks (scope issues)
- Supabase client operations return unknown types that often need casting

## 2. **Migration Naming Convention**
- Pattern MUST be: `YYYYMMDDHHMMSS_prefix_description.sql`
- The underscore after prefix is CRITICAL (not `20250528183000_featAddLogs.sql` but `20250528183000_feat_add_logs.sql`)
- Valid prefixes: `feat_`, `fix_`, `refactor_`, `hf_`
- Migrations are applied in timestamp order, so proper naming ensures correct sequence

## 3. **CI/CD Workflow Structure**
- The `_shared` directory in functions must be explicitly skipped in validation
- Supabase CLI installation can have tar conflicts - use temp directory for extraction
- SQL validation shouldn't be too strict (empty lines are OK)
- Each workflow has specific purposes:
  - `validate.yml`: Runs on every PR to check code quality
  - `preview.yml`: Creates preview environments (managed by Supabase)
  - `production.yml`: Deploys to production on merge to main

## 4. **Preview Environment Architecture**
- **Supabase GitHub Integration**: Preview branches are created automatically via Supabase's GitHub app
- **True Isolation**: Each PR gets its own database instance with unique project ID
- **Automatic Lifecycle**: Preview branches are deleted 20 hours after last commit
- **No Manual Migration Push**: Supabase handles migration application - don't use `supabase db push` in preview workflow
- **Bot Comments**: Supabase bot comments on PRs with deployment status and URLs

## 5. **Preview Environment Troubleshooting**
- **Orphaned Migrations**: Can occur if preview workflows push to main project instead of preview branch
- **Fix**: Ensure GitHub integration is properly linked in Supabase dashboard
- **Verification**: Test tables created in preview should NOT exist in production
- **Project Linking**: Use `supabase link --project-ref` to connect CLI to correct project

## 6. **Error Context and Type Safety**
- TypeScript's implicit any errors need explicit type annotations
- Use type guards consistently: `error instanceof Error`
- Provide fallback values for error messages
- Add explicit return types to async functions
- Use `any` type sparingly and document why when used

## 7. **Single Source of Truth Enforcement**
- NEVER allow dashboard deployments in production
- Edge functions MUST only deploy through CI/CD
- Git should be the only source of schema/function changes
- Preview environments respect this - changes are applied from Git only

## 8. **Environment Configuration**
- Missing environment variables show as warnings but may not block deployment
- Use `.env.example` to document all required variables
- GitHub Secrets must match exact variable names
- Some variables (like GOOGLE_CLIENT_ID) may be optional for preview

## 9. **Integration Testing in Preview**
- Integration tests may fail in preview if they expect specific data
- Consider disabling integration tests temporarily for preview environments
- Use environment-specific test configuration
- Preview databases start fresh - no existing test data

## 10. **Branch Protection Best Practices**
- Required checks should include all critical validations
- Preview check can be required once preview environments are stable
- Don't bypass protection rules - fix the underlying issues
- Admin overrides should be disabled for true enforcement

These patterns will help avoid common pitfalls when working with Supabase CI/CD pipelines.