#!/usr/bin/env ts-node

import { supabaseAdmin } from './database'

async function validateImages() {
  console.log('🔍 Final Image Migration Validation\n')
  
  try {
    // Get coaches with photos
    const { data: coaches, error: coachError } = await supabaseAdmin
      .from('coaches')
      .select('name, photo_url')
      .not('photo_url', 'is', null)
      .limit(10)
    
    if (coachError) {
      console.error('Error fetching coaches:', coachError)
    } else {
      console.log(`✅ Found ${coaches?.length || 0} coaches with photos:`)
      
      for (const coach of coaches || []) {
        if (coach.photo_url) {
          try {
            const response = await fetch(coach.photo_url, { method: 'HEAD' })
            const status = response.ok ? '✅' : '❌'
            console.log(`  ${status} ${coach.name}: ${response.status}`)
          } catch (error) {
            console.log(`  ❌ ${coach.name}: Network error`)
          }
        }
      }
    }
    
    // Get categories with icons
    const { data: categories, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('name, icon')
      .not('icon', 'is', null)
      .limit(10)
    
    if (categoryError) {
      console.error('Error fetching categories:', categoryError)
    } else {
      console.log(`\n✅ Found ${categories?.length || 0} categories with icons (showing first 10):`)
      
      for (const category of categories || []) {
        if (category.icon) {
          try {
            const response = await fetch(category.icon, { method: 'HEAD' })
            const status = response.ok ? '✅' : '❌'
            console.log(`  ${status} ${category.name}`)
          } catch (error) {
            console.log(`  ❌ ${category.name}: Network error`)
          }
        }
      }
    }
    
    // Summary
    const { data: allCoaches } = await supabaseAdmin.from('coaches').select('count')
    const { data: coachesWithPhotos } = await supabaseAdmin
      .from('coaches')
      .select('count')
      .not('photo_url', 'is', null)
    
    const { data: allCategories } = await supabaseAdmin.from('categories').select('count')
    const { data: categoriesWithIcons } = await supabaseAdmin
      .from('categories')
      .select('count')
      .not('icon', 'is', null)
    
    console.log('\n📊 Final Migration Summary:')
    console.log(`   Total coaches: ${allCoaches?.length || 0}`)
    console.log(`   Coaches with photos: ${coachesWithPhotos?.length || 0}`)
    console.log(`   Total categories: ${allCategories?.length || 0}`)
    console.log(`   Categories with icons: ${categoriesWithIcons?.length || 0}`)
    
    const coachPhotoRate = allCoaches?.length ? Math.round((coachesWithPhotos?.length || 0) / allCoaches.length * 100) : 0
    const categoryIconRate = allCategories?.length ? Math.round((categoriesWithIcons?.length || 0) / allCategories.length * 100) : 0
    
    console.log(`\n🎯 Success Rates:`)
    console.log(`   Coach photos: ${coachPhotoRate}%`)
    console.log(`   Category icons: ${categoryIconRate}%`)
    
    console.log('\n🎉 Image migration validation completed!')
    
  } catch (error) {
    console.error('❌ Validation failed:', error)
  }
}

if (require.main === module) {
  validateImages().catch(console.error)
}