#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

async function testAuth() {
  console.log('🔐 Testing authentication...\n')

  // Create client with service key
  const adminClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Create test user with email
  console.log('1️⃣ Creating test user...')
  const testEmail = `test_${Date.now()}@example.com`
  const { data: authData, error: authError } = await adminClient.auth.signUp({
    email: testEmail,
    password: 'test_password_123',
    options: {
      data: { test: true }
    }
  })
  
  if (authError) {
    console.error('❌ Failed to create anonymous user:', authError)
    return
  }

  console.log('✅ Anonymous user created')
  console.log('   User ID:', authData.user?.id)
  console.log('   Access Token:', authData.session?.access_token?.substring(0, 20) + '...')

  // Test the token with a regular client
  console.log('\n2️⃣ Testing token with regular client...')
  const userClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${authData.session?.access_token}`
        }
      }
    }
  )

  const { data: userData, error: userError } = await userClient.auth.getUser()
  
  if (userError) {
    console.error('❌ Failed to get user:', userError)
  } else {
    console.log('✅ User verified:', userData.user?.id)
  }

  // Test recommendations endpoint
  console.log('\n3️⃣ Testing recommendations endpoint...')
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session?.access_token}`,
      'X-Test-Run-Id': 'test_debug'
    },
    body: JSON.stringify({ count: 1 })
  })

  console.log('   Status:', response.status)
  
  if (!response.ok) {
    const error = await response.text()
    console.error('   Error:', error)
  } else {
    const data = await response.json()
    console.log('   Success:', data)
  }

  // Clean up
  await adminClient.auth.signOut()
}

testAuth().catch(console.error)