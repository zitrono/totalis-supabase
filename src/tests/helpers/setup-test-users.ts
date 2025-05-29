import { createClient } from '@supabase/supabase-js'
import { getTestConfig } from '../config/test-env'

interface TestUser {
  email: string
  password: string
  metadata?: Record<string, any>
}

const TEST_USERS: TestUser[] = [
  { email: 'test1@totalis.app', password: 'Test123!@#', metadata: { test_account: true } },
  { email: 'test2@totalis.app', password: 'Test123!@#', metadata: { test_account: true } },
  { email: 'test3@totalis.app', password: 'Test123!@#', metadata: { test_account: true } }
]

export async function setupTestUsers(): Promise<void> {
  const config = getTestConfig()
  
  // Only run in preview mode
  if (!config.isPreview) {
    console.log('⏭️  Skipping test user setup (not in preview mode)')
    return
  }
  
  console.log('🧪 Setting up test users for preview environment...')
  
  // Create admin client with service role key
  const adminClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  // Ensure coaches exist
  console.log('Ensuring coaches exist...')
  const coachesData = [
    { name: 'Daniel', bio: 'Your supportive wellness coach focused on holistic health and mindfulness.', sex: 'male', is_active: true },
    { name: 'Sarah', bio: 'An empathetic guide specializing in mental health and emotional wellbeing.', sex: 'female', is_active: true },
    { name: 'Alex', bio: 'A balanced coach who integrates physical and mental wellness strategies.', sex: 'female', is_active: true }
  ]
  
  for (const coach of coachesData) {
    const { error: coachUpsertError } = await adminClient
      .from('coaches')
      .upsert(coach, { onConflict: 'name' })
    
    if (coachUpsertError) {
      console.error(`Failed to upsert coach ${coach.name}:`, coachUpsertError)
    }
  }
  
  // Ensure categories exist
  console.log('Ensuring categories exist...')
  const categoriesData = [
    { name: 'Physical Health', name_short: 'Physical', description: 'Focus on your body\'s wellbeing through exercise, nutrition, and rest', sort_order: 100, is_active: true, checkin_enabled: true, primary_color: '#4CAF50', secondary_color: '#81C784' },
    { name: 'Mental Health', name_short: 'Mental', description: 'Nurture your mind through mindfulness, stress management, and emotional balance', sort_order: 200, is_active: true, checkin_enabled: true, primary_color: '#2196F3', secondary_color: '#64B5F6' },
    { name: 'Social Wellness', name_short: 'Social', description: 'Build meaningful relationships and community connections', sort_order: 300, is_active: true, checkin_enabled: true, primary_color: '#FF9800', secondary_color: '#FFB74D' },
    { name: 'Personal Growth', name_short: 'Growth', description: 'Develop new skills and pursue your goals', sort_order: 400, is_active: true, checkin_enabled: true, primary_color: '#9C27B0', secondary_color: '#BA68C8' }
  ]
  
  for (const category of categoriesData) {
    await adminClient
      .from('categories')
      .upsert(category, { onConflict: 'name' })
  }
  
  // Get default coach ID
  let defaultCoachId: string
  
  const { data: coaches, error: coachError } = await adminClient
    .from('coaches')
    .select('id')
    .eq('name', 'Daniel')
    .limit(1)
  
  if (coachError || !coaches || coaches.length === 0) {
    console.error('Failed to get default coach:', coachError)
    console.log('Creating fallback coach...')
    
    // Create a fallback coach if none exists
    const { data: newCoach, error: createError } = await adminClient
      .from('coaches')
      .insert({ 
        name: 'Daniel', 
        bio: 'Your supportive wellness coach focused on holistic health and mindfulness.', 
        sex: 'male', 
        is_active: true 
      })
      .select('id')
      .single()
    
    if (createError || !newCoach) {
      throw new Error(`Failed to create default coach: ${createError?.message || 'Unknown error'}`)
    }
    
    defaultCoachId = newCoach.id
  } else {
    defaultCoachId = coaches[0].id
  }
  
  // Create test users
  for (const testUser of TEST_USERS) {
    try {
      // Check if user already exists
      const { data: existingUser } = await adminClient.auth.admin.listUsers()
      const userExists = existingUser?.users?.some(u => u.email === testUser.email)
      
      if (userExists) {
        console.log(`✅ Test user ${testUser.email} already exists`)
        continue
      }
      
      // Create user using admin API to bypass email verification
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true, // Bypass email verification
        user_metadata: testUser.metadata || {}
      })
      
      if (createError) {
        // If user already exists error, continue
        if (createError.message?.includes('already exists')) {
          console.log(`✅ Test user ${testUser.email} already exists`)
          continue
        }
        throw createError
      }
      
      if (!newUser?.user) {
        throw new Error('User creation returned no user data')
      }
      
      // Create profile for the user
      const { error: profileError } = await adminClient
        .from('profiles')
        .insert({
          id: newUser.user.id,
          coach_id: defaultCoachId,
          metadata: {
            test_account: true,
            permanent: true,
            created_at: new Date().toISOString()
          }
        })
      
      if (profileError) {
        // If profile already exists, that's fine
        if (!profileError.message?.includes('duplicate key')) {
          console.warn(`⚠️  Failed to create profile for ${testUser.email}: ${profileError.message}`)
        }
      }
      
      console.log(`✅ Created test user: ${testUser.email}`)
    } catch (error) {
      console.error(`❌ Failed to create test user ${testUser.email}:`, error)
      // Continue with other users even if one fails
    }
  }
  
  console.log('✨ Test user setup complete')
}

// Export test user credentials for use in tests
export const TEST_USER_CREDENTIALS = TEST_USERS.map(u => ({
  email: u.email,
  password: u.password
}))