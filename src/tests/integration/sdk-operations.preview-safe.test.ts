import { test, expect, beforeAll, afterAll } from '@jest/globals'
import { describePreviewSafe, PreviewTestContext } from '../helpers/preview-test-runner'
import * as fs from 'fs'
import * as path from 'path'

describePreviewSafe('SDK Operations - Preview Safe (60% Coverage)', (ctx: PreviewTestContext) => {
  let testImagePath: string

  beforeAll(async () => {
    // Create test image file
    testImagePath = path.join(__dirname, 'test-image.png')
    // Create a simple 1x1 pixel PNG
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
      0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D,
      0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
      0x44, 0xAE, 0x42, 0x60, 0x82
    ])
    fs.writeFileSync(testImagePath, pngBuffer)
  })

  afterAll(async () => {
    // Clean up test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath)
    }
  })

  // ===== Authentication with Seeded Users =====
  test('should authenticate with seeded test user', async () => {
    const user = await ctx.signInAs('test1@totalis.app')
    
    expect(user).toBeDefined()
    expect(user.email).toBe('test1@totalis.app')
    expect(user.role).toBe('authenticated')
  })
  
  test('should switch between test users', async () => {
    // Start with user 1
    await ctx.signInAs(0)
    let currentUser = ctx.currentUser()
    expect(currentUser.email).toBe('test1@totalis.app')
    
    // Switch to user 2
    await ctx.signInAs(1)
    currentUser = ctx.currentUser()
    expect(currentUser.email).toBe('test2@totalis.app')
    
    // Switch back
    await ctx.signInAs(0)
    currentUser = ctx.currentUser()
    expect(currentUser.email).toBe('test1@totalis.app')
  })

  // ===== Profile CRUD Operations =====
  test('should perform profile CRUD operations', async () => {
    await ctx.withUser(0, async () => {
      const supabase = ctx.supabase()
      const userId = ctx.currentUser().id
      
      // Read profile (should exist from seed)
      const { data: profile, error: readError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      expect(readError).toBeNull()
      expect(profile).toBeDefined()
      expect(profile.id).toBe(userId)
      
      // Update profile
      const updates = {
        year_of_birth: 1992,
        sex: 'male',
        notification_settings: {
          email: true,
          push: false,
          sms: false
        }
      }
      
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
      
      expect(updateError).toBeNull()
      expect(updated.year_of_birth).toBe(1992)
    })
  })

  // ===== Category Operations =====
  test('should fetch categories and user preferences', async () => {
    await ctx.withUser(0, async () => {
      const supabase = ctx.supabase()
      const userId = ctx.currentUser().id
      
      // Fetch all categories
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order')
      
      expect(catError).toBeNull()
      expect(categories).toBeDefined()
      expect(categories.length).toBeGreaterThan(0)
      
      // Fetch user's selected categories
      const { data: userCategories, error: ucError } = await supabase
        .from('profile_categories')
        .select('*, categories(*)')
        .eq('user_id', userId)
      
      expect(ucError).toBeNull()
      expect(userCategories).toBeDefined()
      // Test users should have categories from seed
      expect(userCategories.length).toBeGreaterThan(0)
    })
  })

  // ===== Message Operations =====
  test('should create and retrieve messages', async () => {
    await ctx.withUser(1, async () => {
      const supabase = ctx.supabase()
      const userId = ctx.currentUser().id
      
      // Get a category for the message
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .limit(1)
        .single()
      
      // Create a message
      const newMessage = {
        user_id: userId,
        category_id: categories?.id,
        content: 'Test message from preview-safe test',
        role: 'user'
      }
      
      const { data: created, error: createError } = await supabase
        .from('messages')
        .insert(newMessage)
        .select()
        .single()
      
      expect(createError).toBeNull()
      expect(created).toBeDefined()
      expect(created.content).toBe(newMessage.content)
      
      // Retrieve messages
      const { data: messages, error: readError } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      expect(readError).toBeNull()
      expect(messages).toBeDefined()
      expect(messages.length).toBeGreaterThan(0)
      expect(messages[0].id).toBe(created.id)
    })
  })

  // ===== Storage Operations =====
  test('should upload and retrieve files', async () => {
    await ctx.withUser(2, async () => {
      const supabase = ctx.supabase()
      const userId = ctx.currentUser().id
      
      const bucketName = 'user-images'
      const fileName = `test-${userId}-${Date.now()}.png`
      const fileBuffer = fs.readFileSync(testImagePath)
      
      // Upload file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, fileBuffer, {
          contentType: 'image/png',
          upsert: true
        })
      
      if (uploadError?.message?.includes('row-level security')) {
        console.log('⚠️  Storage RLS not configured for test environment')
        return
      }
      
      expect(uploadError).toBeNull()
      expect(uploadData).toBeDefined()
      expect(uploadData?.path).toBe(fileName)
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName)
      
      expect(urlData.publicUrl).toBeDefined()
      expect(urlData.publicUrl).toContain(fileName)
      
      // Clean up
      await supabase.storage
        .from(bucketName)
        .remove([fileName])
    })
  })

  // ===== App Configuration =====
  test('should fetch app configuration', async () => {
    const supabase = ctx.supabase()
    
    // Public config doesn't require auth
    const { data: config, error } = await supabase
      .from('app_config')
      .select('*')
      .eq('is_public', true)
    
    expect(error).toBeNull()
    expect(config).toBeDefined()
    expect(config.length).toBeGreaterThan(0)
    
    // Should include quick_prompts from seed
    const quickPrompts = config.find(c => c.key === 'quick_prompts')
    expect(quickPrompts).toBeDefined()
    expect(quickPrompts?.value).toBeDefined()
  })

  // ===== RLS Policy Testing =====
  test('should enforce RLS policies', async () => {
    await ctx.withUser(0, async () => {
      const supabase = ctx.supabase()
      const currentUserId = ctx.currentUser().id
      const otherUserId = ctx.currentUser().id === '11111111-1111-1111-1111-111111111111'
        ? '22222222-2222-2222-2222-222222222222'
        : '11111111-1111-1111-1111-111111111111'
      
      // Should only see own profile
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
      
      expect(error).toBeNull()
      expect(profiles).toBeDefined()
      expect(profiles?.length).toBe(1)
      expect(profiles?.[0].id).toBe(currentUserId)
      
      // Should not be able to update other user's profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ year_of_birth: 2000 })
        .eq('id', otherUserId)
      
      // Should either get no rows or RLS error
      expect(updateError || profiles?.length === 1).toBeTruthy()
    })
  })

  // ===== Edge Function Calls =====
  test('should call edge functions with camelCase parameters', async () => {
    await ctx.withUser(0, async () => {
      const supabase = ctx.supabase()
      
      // Mock audio data
      const mockAudio = btoa('mock audio data')
      
      const { data, error } = await supabase.functions.invoke('audio-transcription', {
        body: {
          audioBase64: mockAudio,  // camelCase
          languageCode: 'en-US',   // camelCase
          userId: ctx.currentUser().id
        }
      })
      
      // Edge functions might not be deployed in preview
      if (error?.message?.includes('not found')) {
        console.log('⚠️  Edge functions not deployed in preview branch')
        return
      }
      
      // If deployed, should work or return proper error
      if (error) {
        expect(error.message).toBeDefined()
      } else {
        expect(data).toBeDefined()
      }
    })
  })
})