import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

async function testEdgeAuth() {
  console.log('🔧 Testing edge function authentication...')
  console.log(`URL: ${supabaseUrl}`)
  
  // Create client
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  // Sign up a test user
  const email = `test-${Date.now()}@test.com`
  const password = 'test-password-123'
  
  console.log('\n1️⃣ Creating test user...')
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Test User',
        is_test: true
      }
    }
  })
  
  if (signUpError) {
    console.error('❌ Sign up failed:', signUpError)
    return
  }
  
  console.log('✅ User created:', signUpData.user?.id)
  console.log('📝 Session token:', signUpData.session?.access_token?.substring(0, 20) + '...')
  
  // Test with no-auth function first
  console.log('\n2️⃣ Testing no-auth function...')
  const noAuthResponse = await fetch(`${supabaseUrl}/functions/v1/test-recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ count: 1 })
  })
  
  console.log('No-auth response:', noAuthResponse.status)
  if (noAuthResponse.ok) {
    const data = await noAuthResponse.json()
    console.log('✅ No-auth function works:', JSON.stringify(data, null, 2))
  }
  
  // Test with auth function
  console.log('\n3️⃣ Testing auth function with token...')
  const authResponse = await fetch(`${supabaseUrl}/functions/v1/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${signUpData.session?.access_token}`
    },
    body: JSON.stringify({ count: 1 })
  })
  
  console.log('Auth response:', authResponse.status)
  if (!authResponse.ok) {
    const error = await authResponse.text()
    console.error('❌ Auth function failed:', error)
  } else {
    const data = await authResponse.json()
    console.log('✅ Auth function works:', JSON.stringify(data, null, 2))
  }
  
  // Test auth with Supabase client
  console.log('\n4️⃣ Testing auth with Supabase client...')
  const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { 
      headers: { 
        Authorization: `Bearer ${signUpData.session?.access_token}` 
      } 
    }
  })
  
  const { data: userData, error: userError } = await authSupabase.auth.getUser()
  if (userError) {
    console.error('❌ getUser failed:', userError)
  } else {
    console.log('✅ getUser works:', userData.user?.id)
  }
  
  // Cleanup
  console.log('\n5️⃣ Cleaning up test user...')
  const { error: deleteError } = await supabase.auth.admin.deleteUser(signUpData.user!.id)
  if (deleteError) {
    console.error('⚠️  Could not delete test user:', deleteError)
  } else {
    console.log('✅ Test user deleted')
  }
}

testEdgeAuth().catch(console.error)