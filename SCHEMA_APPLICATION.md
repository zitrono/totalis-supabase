# Schema Application Instructions

The schema needs to be applied manually through the Supabase SQL Editor due to authentication issues with the CLI.

## Steps to Apply Schema:

1. **Open SQL Editor**
   - Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor

2. **Copy Migration SQL**
   - Open file: `supabase/migrations/001_initial_schema.sql`
   - Copy the entire contents

3. **Apply Migration**
   - Paste the SQL into the editor
   - Click "Run" button
   - Wait for completion (should take ~30 seconds)

4. **Verify Installation**
   - Run: `npm run test:schema`
   - All 23 tests should pass

5. **Seed Initial Data**
   - Run: `npm run seed:coaches`
   - This will create 4 coaches with Daniel as default

## Expected Results:
- ✅ 13 tables created
- ✅ Multiple indexes created  
- ✅ RLS policies enabled
- ✅ 2 views created
- ✅ 5 functions created
- ✅ Default coach trigger activated
- ✅ Initial app_config entries

## If You Get Errors:

### "extension already exists"
- This is fine, extensions are already enabled

### "relation already exists"
- Some tables might be partially created
- You can drop all tables and retry:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

### Index error with NOW()
- This has been fixed in the migration file
- The problematic index now doesn't use NOW()

## Next Steps After Schema Applied:

1. **Configure Authentication**
   - Follow instructions in `AUTH_SETUP.md`
   - Enable anonymous sign-ins
   - Configure Google OAuth

2. **Seed Coaches**
   ```bash
   npm run seed:coaches
   ```

3. **Test Everything**
   ```bash
   npm run test:scenarios
   ```