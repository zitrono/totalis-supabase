-- Add initial greeting message when user profile is created

-- Create function to send initial greeting
CREATE OR REPLACE FUNCTION public.send_initial_greeting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_name TEXT;
  v_greeting_message TEXT;
BEGIN
  -- Only send greeting if this is a new profile (not an update)
  IF TG_OP = 'INSERT' AND NEW.coach_id IS NOT NULL THEN
    -- Get coach name
    SELECT name INTO v_coach_name
    FROM coaches
    WHERE id = NEW.coach_id;
    
    -- Create personalized greeting message
    v_greeting_message := format(
      E'Hello! I''m %s, your personal wellness coach. I''m here to support you on your health journey. Would you like to start with a quick health check-in to understand where you are today?',
      COALESCE(v_coach_name, 'your coach')
    );
    
    -- Insert greeting message
    INSERT INTO messages (
      user_id,
      coach_id,
      role,
      content,
      content_type,
      answer_options,
      created_at
    ) VALUES (
      NEW.id,
      NEW.coach_id,
      'assistant',
      v_greeting_message,
      'text',
      jsonb_build_object(
        'type', 'radio',
        'options', jsonb_build_array(
          'Yes, let''s do a check-in',
          'Tell me more about check-ins',
          'Maybe later'
        )
      ),
      NOW()
    );
    
    -- Also create a follow-up prompt message (hidden from user)
    INSERT INTO messages (
      user_id,
      coach_id,
      role,
      content,
      content_type,
      metadata,
      created_at
    ) VALUES (
      NEW.id,
      NEW.coach_id,
      'system',
      'Initial greeting sent. Awaiting user response for check-in proposal.',
      'text',
      jsonb_build_object('hidden', true, 'type', 'greeting_followup'),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for initial greeting
CREATE TRIGGER on_user_profile_created_greeting
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_initial_greeting();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.send_initial_greeting() TO authenticated, service_role;