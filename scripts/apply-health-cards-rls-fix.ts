import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function applyHealthCardsRLSFix() {
  console.log('🔧 Applying Health Cards RLS Fix...\n');

  console.log('Since we cannot execute SQL directly via the API, please apply this fix:\n');
  
  console.log('Go to: https://app.supabase.com/project/qdqbrqnqttyjegiupvri/editor');
  console.log('\nRun this SQL:');
  console.log('=====================================');
  console.log(`-- Add INSERT policy for health_cards table
CREATE POLICY "Users can create own health cards" ON health_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also add a policy for service role to create health cards (for edge functions)
CREATE POLICY "Service role can create health cards" ON health_cards
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');`);
  console.log('=====================================\n');
  
  console.log('After applying, run: npm run test:scenarios to verify the fix');
}

applyHealthCardsRLSFix();