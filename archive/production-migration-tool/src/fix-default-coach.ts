#!/usr/bin/env ts-node

import { supabaseAdmin } from './database'

async function fixDefaultCoach() {
  console.log('🔧 Fixing Default Coach Configuration\n')
  
  try {
    // Get the current Daniel coach ID
    const { data: danielCoach } = await supabaseAdmin
      .from('coaches')
      .select('id, name')
      .eq('name', 'Daniel')
      .single()
    
    if (!danielCoach) {
      console.error('❌ Daniel coach not found!')
      return
    }
    
    console.log(`Found Daniel coach: ${danielCoach.id}`)
    
    // Update the default coach configuration
    const { error } = await supabaseAdmin
      .from('app_config')
      .update({
        value: { 
          default_coach_id: danielCoach.id,
          description: 'Default coach assigned to new users'
        },
        updated_at: new Date().toISOString()
      })
      .eq('key', 'default_coach')
    
    if (error) {
      console.error('❌ Failed to update default coach config:', error)
    } else {
      console.log('✅ Updated default coach configuration')
    }
    
    // Verify the configuration
    const { data: config } = await supabaseAdmin
      .from('app_config')
      .select('value')
      .eq('key', 'default_coach')
      .single()
    
    if (config) {
      console.log(`✅ Default coach config verified: ${config.value.default_coach_id}`)
    }
    
    console.log('\n🎉 Default coach configuration fixed!')
    
  } catch (error) {
    console.error('❌ Failed to fix default coach:', error)
  }
}

fixDefaultCoach()