#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') })

async function testFunctionsCorrectly() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  console.log('🔍 Testing database functions with correct parameters...\n')
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  // Create a test user ID
  const testUserId = '00000000-0000-0000-0000-000000000000'
  const testCategoryId = '00000000-0000-0000-0000-000000000001'
  const testThreadId = '00000000-0000-0000-0000-000000000002'

  try {
    // Test 1: get_recommendation_tree (fixed column name)
    console.log('📊 Testing get_recommendation_tree...')
    const { data: recTree, error: recError } = await supabase.rpc('get_recommendation_tree', {
      p_user_id: testUserId,
      p_category_id: testCategoryId
    })
    
    if (recError) {
      console.error(`❌ get_recommendation_tree: ${recError.message}`)
    } else {
      console.log(`✅ get_recommendation_tree: Returns ${recTree?.length || 0} recommendations`)
    }

    // Test 2: get_user_categories (correct params)
    console.log('\n📊 Testing get_user_categories...')
    const { data: userCats, error: userCatsError } = await supabase.rpc('get_user_categories', {
      p_user_id: testUserId  // Only one parameter
    })
    
    if (userCatsError) {
      console.error(`❌ get_user_categories: ${userCatsError.message}`)
    } else {
      console.log(`✅ get_user_categories: Returns ${userCats?.length || 0} categories`)
    }

    // Test 3: toggle_category_favorite (now handles profile creation)
    console.log('\n📊 Testing toggle_category_favorite...')
    const { data: favResult, error: favError } = await supabase.rpc('toggle_category_favorite', {
      p_user_id: testUserId,
      p_category_id: testCategoryId
    })
    
    if (favError) {
      console.error(`❌ toggle_category_favorite: ${favError.message}`)
    } else {
      console.log(`✅ toggle_category_favorite: Toggled to ${favResult}`)
    }

    // Test 4: update_category_subscription (correct order)
    console.log('\n📊 Testing update_category_subscription...')
    const { data: subResult, error: subError } = await supabase.rpc('update_category_subscription', {
      p_user_id: testUserId,
      p_category_id: testCategoryId,
      p_is_subscribed: true,
      p_notification_enabled: true
    })
    
    if (subError) {
      console.error(`❌ update_category_subscription: ${subError.message}`)
    } else {
      console.log(`✅ update_category_subscription: Updated successfully`)
    }

    // Test 5: get_or_create_thread (now handles profile creation)
    console.log('\n📊 Testing get_or_create_thread...')
    const { data: threadId, error: threadError } = await supabase.rpc('get_or_create_thread', {
      p_user_id: testUserId,
      p_category_id: testCategoryId,
      p_coach_id: null,
      p_title: 'Test Thread'
    })
    
    if (threadError) {
      console.error(`❌ get_or_create_thread: ${threadError.message}`)
    } else {
      console.log(`✅ get_or_create_thread: Created/got thread ${threadId}`)
    }

    // Test 6: get_messages_paginated
    console.log('\n📊 Testing get_messages_paginated...')
    const { data: messages, error: msgError } = await supabase.rpc('get_messages_paginated', {
      p_user_id: testUserId,
      p_category_id: testCategoryId,
      p_thread_id: null,
      p_limit: 50,
      p_before_timestamp: null
    })
    
    if (msgError) {
      console.error(`❌ get_messages_paginated: ${msgError.message}`)
    } else {
      console.log(`✅ get_messages_paginated: Retrieved ${messages?.length || 0} messages`)
    }

    // Test 7: mark_messages_read (correct params)
    console.log('\n📊 Testing mark_messages_read...')
    const { data: readCount, error: readError } = await supabase.rpc('mark_messages_read', {
      p_user_id: testUserId,
      p_thread_id: testThreadId,
      p_until_timestamp: new Date().toISOString()
    })
    
    if (readError) {
      console.error(`❌ mark_messages_read: ${readError.message}`)
    } else {
      console.log(`✅ mark_messages_read: Marked ${readCount || 0} messages as read`)
    }

    console.log('\n✨ Function testing complete!')
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...')
    await supabase.from('user_categories')
      .delete()
      .eq('user_id', testUserId)
    
    await supabase.from('message_threads')
      .delete()
      .eq('user_id', testUserId)
      
    await supabase.from('profiles')
      .delete()
      .eq('id', testUserId)
    
    console.log('✅ Test data cleaned up')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

// Run tests
testFunctionsCorrectly().catch(console.error)