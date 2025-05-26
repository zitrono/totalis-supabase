# Production Migration Tool Archive

This folder contains the production data migration toolkit that was used to migrate data from the legacy FastAPI/PostgreSQL system to Supabase.

## Status
- **Purpose**: One-time production data migration
- **Status**: Migration completed (as per migration-plan.md)
- **Archived**: This tool is kept for historical reference

## What It Did
- Exported data from production PostgreSQL
- Transformed data for Supabase schema
- Migrated coaches, categories, and configuration data

## Current Migration Approach
Database changes are now managed through:
- `/supabase/migrations/` - Standard Supabase migrations
- `npm run db:migrate` - Apply migrations

This tool is no longer needed for ongoing development.