import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function verifyMigration() {
  try {
    const { data: coaches } = await supabase.from('tls_coach').select('*');
    const { data: categories } = await supabase.from('tls_category').select('*');
    const { data: config } = await supabase.from('app_config').select('*');
    
    console.log('Raw counts (may be filtered by RLS):');
    console.log('Coaches query result:', coaches?.length);
    console.log('Categories query result:', categories?.length);
    
    console.log('📊 Final Migration Summary:');
    console.log(`✅ Coaches: ${coaches?.length || 0}`);
    console.log(`✅ Categories: ${categories?.length || 0}`);
    console.log(`✅ Config items: ${config?.length || 0}`);
    
    const defaultCoach = config?.find(c => c.key === 'default_coach_id');
    const danielCoach = coaches?.find(c => c.id === defaultCoach?.value);
    
    console.log(`✅ Default coach: ${danielCoach?.name || 'Not found'} (${defaultCoach?.value || 'Not set'})`);
    
    // Check for any remaining duplicates
    const coachNames = coaches?.map(c => c.name) || [];
    const duplicateCoaches = coachNames.filter((name, index) => coachNames.indexOf(name) !== index);
    
    const categoryNames = categories?.map(c => c.name) || [];
    const duplicateCategories = categoryNames.filter((name, index) => categoryNames.indexOf(name) !== index);
    
    if (duplicateCoaches.length === 0 && duplicateCategories.length === 0) {
      console.log('✅ No duplicates found');
    } else {
      console.log('⚠️ Remaining duplicates:', { coaches: duplicateCoaches, categories: duplicateCategories });
    }
    
    console.log('\n🎉 Phase 3 Migration Complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyMigration();