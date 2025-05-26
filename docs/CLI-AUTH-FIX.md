# Fixing Supabase CLI Authentication Issues

## Problem
The Supabase CLI is failing with "Wrong password" error when trying to push migrations using `./supabase-cli db push -p "password"`.

## Root Cause
The literal string "password" is being used instead of the actual database password. The actual database password needs to be obtained from the Supabase Dashboard.

## Solutions

### Solution 1: Get the Correct Password
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `totalis` (ID: qdqbrqnqttyjegiupvri)
3. Navigate to **Settings** → **Database**
4. Find the **Database Password** section
5. Either copy the existing password or reset it
   - **Important**: Use only letters (no special characters) to avoid shell escaping issues

### Solution 2: Use Environment Variable (Recommended)
```bash
# Set the environment variable
export SUPABASE_DB_PASSWORD='your-actual-password'

# Run migrations without -p flag
cd /Users/zitrono/dev/totalis-supabase
./supabase-cli db push
```

### Solution 3: Pass Password Directly
```bash
cd /Users/zitrono/dev/totalis-supabase
./supabase-cli db push -p 'your-actual-password'
```

### Solution 4: Check Connection Type
The error shows it's using the pooler connection (port 6543). If issues persist:

1. Check your connection settings in `supabase/config.toml`
2. Consider using the direct connection instead of pooler for migrations
3. The pooler connection string format is:
   ```
   postgresql://postgres.qdqbrqnqttyjegiupvri:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```

### Solution 5: Alternative Migration Methods

If CLI continues to fail, you can apply migrations directly:

1. **Via Supabase Dashboard SQL Editor**:
   - Go to SQL Editor in your project
   - Copy the content of migration files from `supabase/migrations/`
   - Run each migration manually

2. **Via API/SDK** (already working):
   - Use the scripts in `scripts/` directory that connect via SDK
   - These are already working as shown by successful tests

## Troubleshooting

### If "Wrong password" persists:
1. Ensure no special characters in password (especially `$`, `&`, `!`)
2. Check if your IP is banned (wait 30 minutes or contact support)
3. Verify project is active (not paused)
4. Try different network connection

### Debug Commands:
```bash
# Test connection with debug info
./supabase-cli db push --debug -p 'your-password'

# Check project status
./supabase-cli projects list

# Verify link
./supabase-cli link --project-ref qdqbrqnqttyjegiupvri
```

## Current Status
- ✅ SDK/API connections working (tests passing)
- ✅ Storage operations working
- ❌ CLI database push failing due to authentication
- ✅ Migrations can be applied via Dashboard if needed

## Next Steps
1. Get actual database password from Supabase Dashboard
2. Reset password if needed (use simple letters only)
3. Use environment variable method for CLI operations
4. If CLI continues to fail, use Dashboard SQL Editor for migrations