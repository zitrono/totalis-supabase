import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Public client (for anonymous access)
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Admin client (for service role access)
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);