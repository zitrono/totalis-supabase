#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

async function testWithRealAuth() {
  console.log('🔐 Testing with real authentication flow\n')

  const url = process.env.SUPABASE_URL!
  const anonKey = process.env.SUPABASE_ANON_KEY!

  // Create a client
  const supabase = createClient(url, anonKey)

  // Sign in anonymously
  console.log('1️⃣ Signing in anonymously...')
  const { data: authData, error: authError } = await supabase.auth.signInAnonymously()
  
  if (authError) {
    console.error('❌ Auth error:', authError)
    return
  }

  console.log('✅ Signed in successfully')
  console.log('   User ID:', authData.user?.id)
  console.log('   Session Token:', authData.session?.access_token?.substring(0, 30) + '...')

  // Test recommendations with the session token
  console.log('\n2️⃣ Testing recommendations with session token...')
  const response = await fetch(`${url}/functions/v1/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session?.access_token}`,
      'apikey': anonKey
    },
    body: JSON.stringify({ count: 2 })
  })

  console.log(`   Status: ${response.status}`)
  
  if (response.ok) {
    const data = await response.json()
    console.log('   ✅ Success!')
    console.log('   Recommendations:', data.recommendations?.length)
  } else {
    const error = await response.text()
    console.error('   ❌ Error:', error)
  }

  // Sign out
  await supabase.auth.signOut()
  console.log('\n✅ Test complete')
}

testWithRealAuth().catch(console.error)