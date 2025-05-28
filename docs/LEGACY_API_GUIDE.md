# Legacy API Migration Guide

## Overview

This guide explains how to add new legacy API endpoints without creating new edge functions. We use a single `api-router` edge function that automatically routes requests to database RPC functions.

## Architecture

```
Mobile App → api-router (edge function) → RPC functions (database) → Views/Tables
```

## Benefits

1. **No new edge functions needed** - Just create RPC functions in the database
2. **All logic in SQL** - Easier to maintain, version, and optimize
3. **Automatic routing** - URL paths automatically map to function names
4. **Consistent auth** - Single place for authentication handling
5. **Better performance** - Direct database queries without extra layers

## How to Add a New Legacy Endpoint

### 1. Understand the URL mapping

URLs are automatically converted to RPC function names:
- `/api/user/profile/get` → `api_user_profile_get`
- `/api/messages/list` → `api_messages_list`
- `/api/checkins/create` → `api_checkins_create`

### 2. Create the RPC function

```sql
-- Example: Add /api/user/profile/get endpoint
CREATE OR REPLACE FUNCTION api_user_profile_get(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT row_to_json(u)
  INTO result
  FROM (
    SELECT 
      id::text,
      email,
      display_name,
      avatar_url,
      created_at
    FROM user_profiles
    WHERE user_id = p_user_id
  ) u;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION api_user_profile_get TO authenticated, anon;
```

### 3. Parameter conventions

The api-router automatically adds:
- `p_user_id` - The authenticated user's ID

From the request body:
- `field_name` → `p_field_name`
- Special handling for `checkins` array → `p_checkin_ids`

### 4. Create supporting views if needed

For complex data transformations, create views:

```sql
CREATE OR REPLACE VIEW v_legacy_user_profiles AS
SELECT 
  up.user_id,
  up.display_name as name,
  up.avatar_url as profile_image,
  -- Transform to legacy format
  jsonb_build_object(
    'settings', up.preferences,
    'stats', jsonb_build_object(
      'total_checkins', COALESCE(s.checkin_count, 0),
      'streak', COALESCE(s.current_streak, 0)
    )
  ) as user_data
FROM user_profiles up
LEFT JOIN user_stats s ON up.user_id = s.user_id;
```

## Examples

### Example 1: List endpoint with filters

Legacy endpoint: `/api/checkins/list?category_id=123&limit=10`

```sql
CREATE OR REPLACE FUNCTION api_checkins_list(
  p_user_id uuid,
  p_category_id text DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(c))
    FROM (
      SELECT 
        id::text,
        category_id::text,
        mood_score,
        notes,
        created_at
      FROM checkins
      WHERE user_id = p_user_id
        AND (p_category_id IS NULL OR category_id::text = p_category_id)
      ORDER BY created_at DESC
      LIMIT p_limit
    ) c
  );
END;
$$;
```

### Example 2: Create/Update endpoint

Legacy endpoint: `POST /api/checkins/create`

```sql
CREATE OR REPLACE FUNCTION api_checkins_create(
  p_user_id uuid,
  p_category_id text,
  p_mood_score int,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_checkin checkins;
BEGIN
  INSERT INTO checkins (user_id, category_id, mood_score, notes)
  VALUES (p_user_id, p_category_id::uuid, p_mood_score, p_notes)
  RETURNING * INTO new_checkin;
  
  RETURN row_to_json(new_checkin);
END;
$$;
```

### Example 3: Complex nested data

For endpoints that return nested data:

```sql
CREATE OR REPLACE FUNCTION api_dashboard_data(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'user', (
      SELECT row_to_json(u)
      FROM v_legacy_user_profiles u
      WHERE u.user_id = p_user_id
    ),
    'recent_checkins', (
      SELECT json_agg(c)
      FROM (
        SELECT * FROM v_legacy_checkins
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 5
      ) c
    ),
    'recommendations', (
      SELECT json_agg(r)
      FROM v_legacy_recommendations r
      WHERE r.user_id = p_user_id
        AND r.is_active = true
      LIMIT 10
    )
  );
END;
$$;
```

## Testing

Test your new endpoint:

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/api-router/api/your/endpoint \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"param1": "value1"}'
```

## Migration checklist

When migrating a legacy endpoint:

1. [ ] Identify the exact URL path
2. [ ] Check what parameters it accepts
3. [ ] Understand the response format expected
4. [ ] Create the RPC function with proper parameter names
5. [ ] Test with the actual mobile app or curl
6. [ ] Add appropriate indexes for performance
7. [ ] Document any special behavior

## Common patterns

### Pattern 1: Legacy ID format
Legacy uses string IDs, modern uses UUIDs:
```sql
-- In your function/view:
id::text as id
```

### Pattern 2: Nested objects
Legacy expects nested objects:
```sql
jsonb_build_object(
  'field1', value1,
  'field2', value2
) as nested_field
```

### Pattern 3: Different field names
Use aliases to match legacy names:
```sql
SELECT 
  new_field_name as legacy_field_name
```

### Pattern 4: Conditional responses
```sql
CASE 
  WHEN condition THEN value1
  ELSE value2
END as field_name
```

## Performance tips

1. **Create indexes** on commonly queried fields
2. **Use views** for complex transformations that are reused
3. **Limit results** to prevent large responses
4. **Use EXPLAIN ANALYZE** to optimize queries
5. **Consider materialized views** for expensive computations

## Debugging

1. Check edge function logs in Supabase dashboard
2. Test RPC functions directly in SQL editor
3. Use `RAISE NOTICE` in functions for debugging
4. Check the exact parameter names being passed

## Security

All RPC functions should:
1. Use `SECURITY DEFINER` to run with elevated privileges
2. Include `SET search_path = public` for security
3. Validate user access to requested data
4. Use `p_user_id` from auth, not from request body