# Apply Remote Metadata SQL

To enable test data tracking and cleanup in the remote Supabase database:

1. Open the Supabase SQL Editor:
   https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor

2. Copy the entire contents of `apply-remote-metadata.sql`

3. Paste it into the SQL editor

4. Click "Run" to execute

5. You should see a success message with a list of tables that now have metadata columns

## What this does:
- Adds metadata JSONB columns to all key tables
- Creates indexes for efficient test data queries
- Creates the cleanup_test_data function
- Creates the test_data_summary view
- Sets up proper permissions

## After applying:
Run the tests again to verify cleanup works:
```bash
npm run test:remote
```

The cleanup warnings should disappear and test data management will be fully functional.