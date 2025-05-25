import { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'
import { CONFIG } from './config'

// Production database connection
export async function createProductionClient() {
  const client = new Client(CONFIG.production)
  await client.connect()
  return client
}

// Supabase clients
export const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey)
export const supabaseAdmin = createClient(CONFIG.supabase.url, CONFIG.supabase.serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database health check
export async function checkConnections() {
  try {
    // Test production connection
    const prodClient = await createProductionClient()
    const prodResult = await prodClient.query('SELECT 1 as test')
    await prodClient.end()
    console.log('✅ Production database connection successful')

    // Test Supabase connection
    const { data, error } = await supabaseAdmin.from('coaches').select('count').limit(1)
    if (error) throw error
    console.log('✅ Supabase connection successful')

    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}