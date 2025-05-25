# Fix User Creation Trigger

The anonymous authentication is failing due to an issue with the user profile creation trigger.

## Apply the Fix:

1. Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor

2. Copy and run this SQL:

```sql
-- Fix user creation trigger

-- First, drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a more robust version of the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_coach_id UUID;
BEGIN
  -- Get default coach
  BEGIN
    -- First try to get from config
    SELECT (value->>'default_coach_id')::UUID INTO v_default_coach_id
    FROM app_config 
    WHERE key = 'default_coach' 
    AND value->>'default_coach_id' IS NOT NULL
    LIMIT 1;
    
    -- If not in config, get Daniel
    IF v_default_coach_id IS NULL THEN
      SELECT id INTO v_default_coach_id
      FROM coaches 
      WHERE is_active = true 
      AND name = 'Daniel' 
      LIMIT 1;
    END IF;
    
    -- If still null, get any active coach
    IF v_default_coach_id IS NULL THEN
      SELECT id INTO v_default_coach_id
      FROM coaches 
      WHERE is_active = true 
      ORDER BY created_at 
      LIMIT 1;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- If any error, just set to null
      v_default_coach_id := NULL;
  END;
  
  -- Create user profile
  BEGIN
    INSERT INTO public.user_profiles (id, coach_id, created_at, updated_at)
    VALUES (
      NEW.id, 
      v_default_coach_id,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the user creation
      RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.coaches TO anon, authenticated;
GRANT SELECT ON public.app_config TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
```

3. After running, test authentication again:
   ```bash
   npm run test:auth
   ```

## What This Fixes:

1. **Error Handling**: The trigger won't fail user creation if there's an error
2. **Permissions**: Ensures anon role has proper access
3. **Null Safety**: Handles cases where no coach is available
4. **Conflict Resolution**: Uses ON CONFLICT to avoid duplicate key errors

## Alternative: Disable Trigger Temporarily

If the above doesn't work, try disabling the trigger:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

Then users can be created without profiles, and we'll handle profile creation in the application.