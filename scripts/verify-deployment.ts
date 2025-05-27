#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') })

async function verifyDeployment() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  console.log('🔍 Verifying Supabase deployment...\n')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Test 1: Check new tables exist
    console.log('📊 Checking database tables...')
    const tables = [
      'checkins',
      'checkin_answers', 
      'checkin_templates',
      'user_categories',
      'message_threads'
    ]

    for (const table of tables) {
      const { error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        console.error(`❌ Table ${table}: ${error.message}`)
      } else {
        console.log(`✅ Table ${table}: OK`)
      }
    }

    // Test 2: Check new columns
    console.log('\n📝 Checking new columns...')
    
    // Check profiles columns
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_tester, birth_year, summarization_enabled')
      .limit(1)
    
    if (profileError) {
      console.error(`❌ Profile columns: ${profileError.message}`)
    } else {
      console.log('✅ Profile columns: is_tester, birth_year, summarization_enabled')
    }

    // Check coaches columns
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('id, voice, image_small_url, image_medium_url, image_large_url, system_prompt')
      .limit(1)
    
    if (coachError) {
      console.error(`❌ Coach columns: ${coachError.message}`)
    } else {
      console.log('✅ Coach columns: voice, image URLs, system_prompt')
    }

    // Check categories columns
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, followup_chat_enabled, prompt_followup')
      .limit(1)
    
    if (categoryError) {
      console.error(`❌ Category columns: ${categoryError.message}`)
    } else {
      console.log('✅ Category columns: followup_chat_enabled, prompt_followup')
    }

    // Check messages columns
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('id, voice_url, duration_seconds, thread_id, reply_to_id, message_type')
      .limit(1)
    
    if (messageError) {
      console.error(`❌ Message columns: ${messageError.message}`)
    } else {
      console.log('✅ Message columns: voice_url, thread_id, message_type, etc.')
    }

    // Check recommendations columns
    const { data: rec, error: recError } = await supabase
      .from('recommendations')
      .select('id, expires_at, level, parent_recommendation_id, is_active, view_count')
      .limit(1)
    
    if (recError) {
      console.error(`❌ Recommendation columns: ${recError.message}`)
    } else {
      console.log('✅ Recommendation columns: hierarchy support, expiration, view tracking')
    }

    // Test 3: Check edge function
    console.log('\n🚀 Checking edge function...')
    const functionUrl = `${supabaseUrl}/functions/v1/checkin-process`
    
    try {
      const response = await fetch(functionUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      })
      
      if (response.ok) {
        console.log('✅ Edge function checkin-process: Deployed and responding')
      } else {
        console.log(`⚠️  Edge function checkin-process: Status ${response.status}`)
      }
    } catch (error: any) {
      console.error(`❌ Edge function checkin-process: ${error.message}`)
    }

    // Test 4: Check functions exist
    console.log('\n🔧 Checking database functions...')
    const functions = [
      'get_recommendation_tree',
      'get_user_categories',
      'toggle_category_favorite',
      'update_category_subscription',
      'get_or_create_thread',
      'get_messages_paginated',
      'mark_messages_read'
    ]

    for (const func of functions) {
      const { data, error } = await supabase.rpc(func, {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_category_id: '00000000-0000-0000-0000-000000000000'
      })
      
      if (error && !error.message.includes('violates row-level security')) {
        console.error(`❌ Function ${func}: ${error.message}`)
      } else {
        console.log(`✅ Function ${func}: Available`)
      }
    }

    console.log('\n✨ Deployment verification complete!')
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
    process.exit(1)
  }
}

// Run verification
verifyDeployment().catch(console.error)