import { createClient } from '@supabase/supabase-js';
import { config } from './index';

// Create Supabase clients
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);