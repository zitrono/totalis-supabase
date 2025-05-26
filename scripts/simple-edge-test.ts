#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv'

dotenv.config()

async function testEdgeFunction() {
  console.log('🧪 Simple Edge Function Test\n')

  const url = process.env.SUPABASE_URL!
  const anonKey = process.env.SUPABASE_ANON_KEY!

  // Test 1: Webhook (no auth required)
  console.log('1️⃣ Testing webhook (no auth)...')
  const webhookRes = await fetch(`${url}/functions/v1/langflow-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ test: true })
  })
  console.log(`   Status: ${webhookRes.status}`)
  if (webhookRes.ok) {
    const data = await webhookRes.json()
    console.log('   ✅ Success:', data.received)
  }

  // Test 2: Recommendations with anon key as auth
  console.log('\n2️⃣ Testing recommendations with anon key...')
  const recRes = await fetch(`${url}/functions/v1/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey
    },
    body: JSON.stringify({ count: 1 })
  })
  console.log(`   Status: ${recRes.status}`)
  const recText = await recRes.text()
  console.log(`   Response: ${recText.substring(0, 100)}...`)

  // Test 3: Check what's in the auth header
  console.log('\n3️⃣ Testing with service key...')
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!
  const serviceRes = await fetch(`${url}/functions/v1/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': anonKey
    },
    body: JSON.stringify({ count: 1 })
  })
  console.log(`   Status: ${serviceRes.status}`)
  if (!serviceRes.ok) {
    const error = await serviceRes.text()
    console.log(`   Error: ${error}`)
  }
}

testEdgeFunction().catch(console.error)