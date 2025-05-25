#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function applyRLSFix() {
  console.log('🔧 Applying RLS policy fix for health_cards...')
  
  // Drop existing policies
  await supabaseAdmin.rpc('exec_sql', { 
    sql: 'DROP POLICY IF EXISTS "Users can view own health cards" ON health_cards;' 
  })
  await supabaseAdmin.rpc('exec_sql', { 
    sql: 'DROP POLICY IF EXISTS "Users can update own health cards" ON health_cards;' 
  })
  
  // Create new policies
  await supabaseAdmin.rpc('exec_sql', { 
    sql: `CREATE POLICY "Users can view own health cards" ON health_cards
          FOR SELECT USING (auth.uid() = user_id);` 
  })
  
  await supabaseAdmin.rpc('exec_sql', { 
    sql: `CREATE POLICY "Users can create own health cards" ON health_cards
          FOR INSERT WITH CHECK (auth.uid() = user_id);` 
  })
  
  await supabaseAdmin.rpc('exec_sql', { 
    sql: `CREATE POLICY "Users can update own health cards" ON health_cards
          FOR UPDATE USING (auth.uid() = user_id);` 
  })
  
  await supabaseAdmin.rpc('exec_sql', { 
    sql: `CREATE POLICY "Service role can manage all health cards" ON health_cards
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');` 
  })
  
  console.log('✅ RLS policies updated')
}

async function seedCategories() {
  console.log('🌱 Seeding categories...')
  
  const categories = [
    { name: 'Physical Health', sort_order: 1 },
    { name: 'Mental Health', sort_order: 2 },
    { name: 'Nutrition', sort_order: 3 },
    { name: 'Sleep', sort_order: 4 },
    { name: 'Exercise', sort_order: 5 },
    { name: 'Stress Management', sort_order: 6 },
    { name: 'Relationships', sort_order: 7 },
    { name: 'Personal Growth', sort_order: 8 }
  ]
  
  for (const category of categories) {
    const { error } = await supabaseAdmin
      .from('categories')
      .insert(category)
    
    if (error) {
      console.error(`Error seeding category ${category.name}:`, error)
    } else {
      console.log(`✅ Seeded: ${category.name}`)
    }
  }
}

async function main() {
  try {
    await applyRLSFix()
    await seedCategories()
    
    // Verify categories were seeded
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('name')
      .order('sort_order')
    
    if (error) {
      console.error('Error checking categories:', error)
    } else {
      console.log(`\n📊 Categories in database: ${categories.length}`)
      categories.forEach(cat => console.log(`   - ${cat.name}`))
    }
    
    console.log('\n🎉 All fixes applied successfully!')
    
  } catch (error) {
    console.error('❌ Error applying fixes:', error)
    process.exit(1)
  }
}

main()