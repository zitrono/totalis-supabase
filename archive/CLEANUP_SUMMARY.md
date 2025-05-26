# Cleanup Summary - May 26, 2025

This directory contains files that were archived during the Supabase project structure cleanup.

## What Was Cleaned Up

### 1. Archived to `supabase-setup/`
- **Schema Documentation**: Old schema planning documents that don't reflect current migrations
- **SQL Scripts**: Various ad-hoc SQL files used during development
- **Setup Scripts**: TypeScript files for initial setup and configuration
- **Purpose**: These files represent various approaches tried during initial setup

### 2. Archived to `production-migration-tool/`
- **Migration Project**: Separate project used for one-time production data migration
- **Status**: Migration completed, tool no longer needed
- **Purpose**: Historical reference for the production migration process

### 3. Deleted
- `supabase.tar.gz` - Backup archive, no longer needed

### 4. Clarified
- `supabase-cli` - Added README explaining this is the renamed CLI binary

## Current Project Structure

The project now follows standard Supabase conventions:
```
/supabase/
├── migrations/     # Database schema (source of truth)
├── functions/      # Edge functions
├── seed.sql       # Initial data
└── config.toml    # Project configuration

/scripts/test/      # Active test management scripts
├── cleanup-test-data.ts
└── monitor-test-data.ts
```

## Key Improvements

1. **Single Source of Truth**: Database schema is only in `/supabase/migrations/`
2. **Clear Structure**: Standard Supabase directory layout
3. **Reduced Confusion**: No competing approaches or outdated documentation
4. **Preserved History**: Important files archived rather than deleted

## For Developers

- Always use `/supabase/migrations/` for database changes
- Follow the patterns in existing edge functions
- See `REMOTE_TESTING_GUIDE.md` for testing procedures
- Check `CLAUDE.md` for project-specific rules