# Archived Supabase Setup Files

This directory contains historical files from the initial Supabase setup and migration process. These files are kept for reference but are **no longer actively used**.

## Current Approach

The project now uses the standard Supabase structure:
- Database schema: `/supabase/migrations/`
- Edge functions: `/supabase/functions/`
- Configuration: `/supabase/config.toml`

## Archived Files

### Schema Documentation
- `supabase-database-schema.md` - Original schema planning document
- `SCHEMA_APPLICATION.md` - Manual migration instructions (outdated)
- `supabase-test-client-specification.md` - Original test client specification

### SQL Scripts
Various SQL files that were used during development:
- `verify-schema.sql` - Schema verification queries
- `quick-test.sql` - Quick connectivity tests
- `test-sql-access.sql` - SQL access tests
- `fix-*.sql` - Various fixes applied during development
- `seed-categories.sql` - Category seeding (now in `/supabase/seed.sql`)

### TypeScript Setup Scripts
Scripts used for initial setup and configuration:
- `apply-schema*.ts` - Various schema application approaches
- `test-schema.ts` - Schema testing
- `check-schema*.ts` - Schema verification
- `configure-auth.ts` - Auth configuration
- `setup-supabase-cli.ts` - CLI setup helper

## Why These Files Were Archived

1. **Superseded by Migrations**: The schema is now managed through proper Supabase migrations
2. **One-time Setup**: Many scripts were for initial setup only
3. **Multiple Approaches**: Various attempts at schema management created confusion
4. **Standardization**: Project now follows standard Supabase conventions

## If You Need These Files

These files may be useful for:
- Understanding the project's evolution
- Debugging historical issues
- Reference for similar migrations

However, for current development, always use:
- `/supabase/migrations/` for schema changes
- `npm run db:migrate` to apply migrations
- `REMOTE_TESTING_GUIDE.md` for testing procedures