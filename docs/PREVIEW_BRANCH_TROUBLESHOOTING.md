# Preview Branch Troubleshooting Guide

## Common Issues and Solutions

### 1. "must be owner of table users" Error

**Problem**: Preview branches fail with permission errors when migrations try to modify `auth.users` table.

**Root Cause**: The `auth.users` table is owned by `supabase_auth_admin` role, which preview branch migrations don't have access to.

**Symptoms**:
```
failed to send batch: ERROR: must be owner of table users (SQLSTATE 42501)
```

**Solution**: Refactor migrations to avoid direct modifications to `auth.users`:

#### ❌ Problematic Patterns to Avoid:
```sql
-- Don't UPDATE auth.users directly
UPDATE auth.users SET raw_app_meta_data = ...;

-- Don't CREATE TRIGGER without proper permissions
CREATE TRIGGER on_auth_user_created ON auth.users ...;

-- Don't GRANT on auth schema without checks
GRANT SELECT ON auth.users TO authenticated;
```

#### ✅ Safe Patterns to Use:
```sql
-- Read from auth.users (usually allowed)
SELECT * FROM auth.users WHERE id = ...;

-- Use SECURITY DEFINER functions
CREATE FUNCTION my_function() RETURNS ... 
SECURITY DEFINER AS $$ ... $$;

-- Check for role existence before granting
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT ON my_table TO authenticated;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END $$;

-- Use ON CONFLICT to handle duplicates
INSERT INTO profiles (...) VALUES (...) 
ON CONFLICT (id) DO NOTHING;
```

### 2. Test User Creation Failures

**Problem**: Integration tests fail because test users already exist in preview branch.

**Solution**: Tests should handle existing users gracefully:
```typescript
try {
  await createUser(...)
} catch (error) {
  if (error.code === 'email_exists') {
    // User already exists, proceed with login
  }
}
```

### 3. Edge Function Deployment Failures

**Problem**: Edge functions fail to deploy due to database migration errors.

**Solution**: Ensure migrations complete successfully before edge function deployment.

## Best Practices for Preview-Safe Migrations

1. **Always use SECURITY DEFINER** for functions that need elevated permissions
2. **Check role existence** before granting permissions
3. **Use IF EXISTS/IF NOT EXISTS** clauses liberally
4. **Handle conflicts gracefully** with ON CONFLICT clauses
5. **Test locally first** using `supabase db push --dry-run`

## Migration Validation Checklist

Before creating a PR, ensure your migrations:
- [ ] Don't directly modify `auth.users` table
- [ ] Use `IF EXISTS` for DROP statements
- [ ] Use `IF NOT EXISTS` for CREATE statements
- [ ] Handle permission errors gracefully
- [ ] Work with both new and existing data

## Debugging Preview Branch Issues

1. Check the Supabase comment on the PR for specific errors
2. Look for the "Branch Error" section with detailed error messages
3. Review the GitHub Actions logs for the specific migration that failed
4. Test the migration locally with restricted permissions:
   ```bash
   # Test with limited permissions
   supabase db push --dry-run
   ```

## When to Skip Preview Branches

Some migrations might be impossible to run in preview branches due to fundamental permission restrictions. In these cases:

1. Document the limitation in the PR description
2. Test thoroughly in a development project
3. Consider splitting the migration into preview-safe and production-only parts
4. Use the `--admin` flag for production deployment only