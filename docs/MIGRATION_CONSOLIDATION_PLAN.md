# Migration Consolidation Plan

## Overview

This document outlines the plan to consolidate all existing migrations into a single base migration that works with Supabase preview branches.

## Problem Statement

- Current migrations contain operations on `auth.users` table
- Preview branches fail with "must be owner of table users" error
- Multiple migrations have accumulated technical debt
- Difficult to understand the complete schema from 20+ migration files

## Solution: Migration Consolidation

### Benefits

1. **Preview Branch Compatibility**: No auth.users modifications
2. **Cleaner Schema**: Single source of truth for database structure
3. **Better Performance**: Faster initial setup
4. **Easier Maintenance**: One file to understand the entire schema
5. **Fresh Start**: Opportunity to optimize and clean up

### Key Changes

1. **JWT-Based Authentication**
   - All auth checks use `auth.jwt()` claims
   - No triggers on `auth.users` table
   - Profile creation via RPC function

2. **Explicit Profile Management**
   - Apps must call `create_profile_if_needed()` after auth
   - No automatic profile creation via triggers
   - Clean separation between auth and app data

## Implementation Steps

### Phase 1: Preparation
- [x] Create consolidated schema migration
- [x] Remove all auth.users references
- [x] Implement JWT-based auth functions
- [ ] Archive existing migrations

### Phase 2: Testing
- [ ] Test on fresh local database
- [ ] Verify all tables and functions created
- [ ] Test RPC profile creation
- [ ] Verify RLS policies work correctly

### Phase 3: Deployment Strategy

#### Option A: Fresh Start (Recommended for Development)
1. Create new Supabase project
2. Apply consolidated migration
3. Run seed data
4. Update environment variables
5. Test thoroughly

#### Option B: Production Migration
1. Backup production database
2. Document current migration state
3. Create transition plan
4. Apply during maintenance window
5. Update migration history table

### Phase 4: App Updates
- [ ] Update mobile app to call `create_profile_if_needed()`
- [ ] Update any backend services
- [ ] Update documentation

## Migration Commands

```bash
# Archive existing migrations
./scripts/consolidate-migrations.sh

# Apply consolidated migration to fresh database
supabase db reset

# Or apply to specific project
supabase db push --project-id YOUR_PROJECT_ID
```

## Breaking Changes

### For Mobile Apps
```dart
// After successful authentication:
await supabase.rpc('create_profile_if_needed');
```

### For Backend Services
- No more automatic profile creation
- Must explicitly create profiles after auth
- Check auth type using `check_auth_type()` function

## Rollback Plan

If issues arise:
1. Restore from backup
2. Revert to original migrations
3. Fix issues in consolidated migration
4. Retry with fixes

## Success Criteria

- [ ] Preview branches deploy successfully
- [ ] All integration tests pass
- [ ] Mobile app works with new auth flow
- [ ] No data loss during migration
- [ ] Performance improvement verified

## Timeline

- **Week 1**: Testing and refinement
- **Week 2**: Staging deployment
- **Week 3**: Production deployment
- **Week 4**: Monitor and optimize

## Notes

- Keep archived migrations for reference
- Document any custom business logic
- Update all environment documentation
- Train team on new approach