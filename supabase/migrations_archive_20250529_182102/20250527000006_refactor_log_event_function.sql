-- Replace Analytics Event Logging Function
-- ========================================
-- Drop old function and create new one with proper return type

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS log_event(TEXT, JSONB);

-- Create the new log_event function
CREATE OR REPLACE FUNCTION log_event(
    event_name TEXT,
    properties JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_event_id UUID;
    v_session_id TEXT;
    v_platform TEXT;
    v_app_version TEXT;
BEGIN
    -- Get current user ID (null for anonymous)
    v_user_id := auth.uid();
    
    -- Extract common properties
    v_session_id := properties->>'session_id';
    v_platform := properties->>'platform';
    v_app_version := properties->>'app_version';
    
    -- Insert the event
    INSERT INTO analytics_events (
        user_id,
        event_name,
        properties,
        session_id,
        platform,
        app_version,
        metadata
    ) VALUES (
        v_user_id,
        event_name,
        properties,
        v_session_id,
        v_platform,
        v_app_version,
        CASE 
            WHEN properties->>'test_user' = 'true' 
            THEN jsonb_build_object('test_data', true)
            ELSE '{}'
        END
    )
    RETURNING id INTO v_event_id;
    
    -- Return success response
    RETURN jsonb_build_object(
        'success', true,
        'event_id', v_event_id,
        'timestamp', NOW()
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Log errors but don't fail (analytics should not break the app)
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION log_event TO authenticated, anon;