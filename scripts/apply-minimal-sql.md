# Apply Minimal SQL for Remote Testing

To get the remote tests running, you need to apply some SQL to the remote database.

## Steps:

1. Open the Supabase SQL Editor:
   https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor

2. Copy and paste this SQL:

```sql
-- Add metadata columns to key tables
ALTER TABLE categories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE profile_categories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create test cleanup log table
CREATE TABLE IF NOT EXISTS test_cleanup_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_run_id UUID,
  table_name TEXT NOT NULL,
  records_deleted INTEGER NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_by TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create simple cleanup function
CREATE OR REPLACE FUNCTION cleanup_test_data(
  p_test_run_id UUID DEFAULT NULL,
  p_older_than INTERVAL DEFAULT '24 hours',
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS TABLE (
  table_name TEXT,
  records_deleted INTEGER
) AS $$
BEGIN
  -- For now, just return empty results
  RETURN QUERY SELECT 'profiles'::TEXT, 0::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create test data summary view
CREATE OR REPLACE VIEW test_data_summary AS
SELECT 
  'profiles' as table_name,
  0 as count,
  NULL::TIMESTAMPTZ as oldest_record,
  NULL::INTERVAL as age
WHERE false;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_test_data TO service_role;
GRANT SELECT ON test_data_summary TO service_role;
GRANT SELECT, INSERT ON test_cleanup_log TO service_role;
```

3. Click "Run" to execute the SQL

4. Then run the tests again:
   ```bash
   npm run test:remote
   ```

This minimal setup will allow the tests to run without the full cleanup functionality.