# Supabase Project Structure

This directory contains all Supabase configuration and assets managed as code.

## Directory Structure

```
supabase/
├── migrations/      # Database schema migrations
├── functions/       # Edge Functions source code
├── seed.sql        # Initial seed data
├── config.toml     # Project configuration
└── assets/         # Storage bucket files (future)
```

## Local Development

### Prerequisites
- Supabase CLI v2.23.4+
- Node.js 18+
- Access to remote Supabase project

### Setup
```bash
# Authenticate CLI
supabase login --token $SUPABASE_ACCESS_TOKEN
supabase link --project-ref qdqbrqnqttyjegiupvri

# Apply latest migrations
supabase db push --password $SUPABASE_DB_PASSWORD
```

## Migration Management

### Creating a New Migration
```bash
# Create migration following naming convention
supabase migration new feat_add_user_preferences

# This creates: migrations/YYYYMMDDHHMMSS_feat_add_user_preferences.sql
```

### Migration Naming Convention
- Format: `YYYYMMDDHHMMSS_prefix_description.sql`
- Prefixes:
  - `feat_` - New features (tables, columns)
  - `fix_` - Bug fixes or corrections
  - `refactor_` - Non-functional changes
  - `hf_` - Hotfixes
- Max 50 characters after timestamp

### Migration Best Practices
- Always use `IF NOT EXISTS` / `IF EXISTS` clauses
- Make migrations reversible when possible
- Keep migrations small and focused
- Test locally before pushing

## Edge Functions

### Function Structure
```
functions/
├── function-name/
│   └── index.ts    # Main function entry point
```

### Deploy Functions
```bash
# Deploy all functions
./scripts/deploy-edge-functions.sh

# Deploy specific function
./scripts/deploy-edge-functions.sh function-name
```

### Function Requirements
- All secrets must be validated at runtime
- Use `--use-api` flag for deployment (no Docker)
- Follow TypeScript best practices

## Seed Data

The `seed.sql` file contains essential initial data:
- Coaches (Daniel, Sarah, Alex)
- Categories (Health domains)
- App configuration

This runs automatically on preview environments but NOT on production.

## Storage Buckets

Bucket configuration is managed in `config.toml`:
- `coach-images` - Coach profile photos
- `category-icons` - Category icons
- `voice-messages` - User voice recordings
- `user-images` - User uploads

## CI/CD Integration

All changes are deployed via GitHub Actions:
1. **Pull Request** → Preview environment with auto-cleanup
2. **Merge to main** → Production deployment with approval

See `.github/workflows/` for pipeline configuration.

## Environment Variables

Required secrets (set in GitHub):
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Troubleshooting

### Migration Conflicts
```bash
# Check migration status
supabase migration list

# Repair migration history if needed
supabase migration repair
```

### Function Deployment Issues
- Ensure `SUPABASE_ACCESS_TOKEN` is valid
- Check function has `index.ts`
- Verify TypeScript syntax with `deno check`

### Connection Issues
- Verify you're on the correct branch
- Re-run `supabase link` if project changed
- Check network connectivity to Supabase