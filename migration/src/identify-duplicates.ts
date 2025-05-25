#!/usr/bin/env ts-node

import { supabaseAdmin } from './database'

async function identifyDuplicates() {
  console.log('🔍 Identifying Duplicate Records and Images\n')
  
  try {
    let duplicateCoaches: any[] = []
    let duplicateCategories: any[] = []
    
    // Check for duplicate coaches
    console.log('1️⃣ Checking for duplicate coaches...')
    const { data: coaches, error: coachError } = await supabaseAdmin
      .from('coaches')
      .select('id, name, photo_url, created_at')
      .order('name')
    
    if (coachError) {
      console.error('Error fetching coaches:', coachError)
    } else {
      console.log(`Total coaches in database: ${coaches?.length || 0}`)
      
      // Group by name to find duplicates
      const coachNames = new Map<string, any[]>()
      coaches?.forEach(coach => {
        if (!coachNames.has(coach.name)) {
          coachNames.set(coach.name, [])
        }
        coachNames.get(coach.name)?.push(coach)
      })
      
      duplicateCoaches = Array.from(coachNames.entries())
        .filter(([_, coaches]) => coaches.length > 1)
      
      if (duplicateCoaches.length > 0) {
        console.log(`\n❌ Found ${duplicateCoaches.length} coaches with duplicates:`)
        duplicateCoaches.forEach(([name, duplicates]) => {
          console.log(`\n  "${name}" (${duplicates.length} copies):`)
          duplicates.forEach((coach, index) => {
            console.log(`    ${index + 1}. ID: ${coach.id}`)
            console.log(`       Photo: ${coach.photo_url ? 'Yes' : 'No'}`)
            console.log(`       Created: ${new Date(coach.created_at).toISOString()}`)
          })
        })
      } else {
        console.log('✅ No duplicate coaches found')
      }
    }
    
    // Check for duplicate categories
    console.log('\n2️⃣ Checking for duplicate categories...')
    const { data: categories, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('id, name, icon, created_at')
      .order('name')
    
    if (categoryError) {
      console.error('Error fetching categories:', categoryError)
    } else {
      console.log(`Total categories in database: ${categories?.length || 0}`)
      
      // Group by name to find duplicates
      const categoryNames = new Map<string, any[]>()
      categories?.forEach(category => {
        if (!categoryNames.has(category.name)) {
          categoryNames.set(category.name, [])
        }
        categoryNames.get(category.name)?.push(category)
      })
      
      duplicateCategories = Array.from(categoryNames.entries())
        .filter(([_, categories]) => categories.length > 1)
      
      if (duplicateCategories.length > 0) {
        console.log(`\n❌ Found ${duplicateCategories.length} categories with duplicates:`)
        duplicateCategories.forEach(([name, duplicates]) => {
          console.log(`\n  "${name}" (${duplicates.length} copies):`)
          duplicates.forEach((category, index) => {
            console.log(`    ${index + 1}. ID: ${category.id}`)
            console.log(`       Icon: ${category.icon ? 'Yes' : 'No'}`)
            console.log(`       Created: ${new Date(category.created_at).toISOString()}`)
          })
        })
      } else {
        console.log('✅ No duplicate categories found')
      }
    }
    
    // Check for image URLs patterns to identify potential duplicates
    console.log('\n3️⃣ Checking for image URL patterns...')
    
    const { data: coachPhotos } = await supabaseAdmin
      .from('coaches')
      .select('name, photo_url')
      .not('photo_url', 'is', null)
    
    if (coachPhotos) {
      console.log(`Found ${coachPhotos.length} coaches with photos`)
      
      // Extract image IDs from URLs to identify patterns
      const imageIds = new Map<string, string[]>()
      
      coachPhotos.forEach(coach => {
        if (coach.photo_url) {
          const match = coach.photo_url.match(/image_(\d+)_/)
          if (match) {
            const imageId = match[1]
            if (!imageIds.has(imageId)) {
              imageIds.set(imageId, [])
            }
            imageIds.get(imageId)?.push(coach.name)
          }
        }
      })
      
      console.log('\nImage ID usage:')
      Array.from(imageIds.entries()).forEach(([imageId, coaches]) => {
        if (coaches.length > 1) {
          console.log(`  Image ${imageId}: Used by ${coaches.join(', ')}`)
        }
      })
    }
    
    // Summary and recommendations
    console.log('\n4️⃣ Summary and Recommendations:')
    
    const duplicateCoachCount = duplicateCoaches?.length || 0
    const duplicateCategoryCount = duplicateCategories?.length || 0
    
    if (duplicateCoachCount > 0 || duplicateCategoryCount > 0) {
      console.log('\n🚨 Action Required:')
      if (duplicateCoachCount > 0) {
        console.log(`   - Remove ${duplicateCoachCount} duplicate coach groups`)
      }
      if (duplicateCategoryCount > 0) {
        console.log(`   - Remove ${duplicateCategoryCount} duplicate category groups`)
      }
      console.log('\n💡 Cleanup Strategy:')
      console.log('   1. Keep the record with the most recent created_at timestamp')
      console.log('   2. Keep the record with a photo_url/icon if others don\'t have one')
      console.log('   3. Update any foreign key references before deletion')
      console.log('   4. Clean up orphaned images from storage')
    } else {
      console.log('✅ No database duplicates found - migration was clean!')
    }
    
    console.log('\n🎉 Duplicate analysis completed!')
    
  } catch (error) {
    console.error('❌ Analysis failed:', error)
  }
}

if (require.main === module) {
  identifyDuplicates().catch(console.error)
}