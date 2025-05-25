#!/usr/bin/env ts-node

import { supabaseAdmin } from './database'
import { MIGRATION_CONFIG } from './config'

async function checkStorage() {
  console.log('📦 Checking Supabase Storage Contents\n')
  
  try {
    // Check coach images bucket
    console.log('1️⃣ Checking coach images...')
    const { data: coachFiles, error: coachError } = await supabaseAdmin.storage
      .from(MIGRATION_CONFIG.storageBuckets.coachImages)
      .list('', { limit: 100 })
    
    if (coachError) {
      console.error('Error listing coach images:', coachError)
    } else {
      console.log(`Found ${coachFiles?.length || 0} items in coach-images bucket`)
      
      // Check subdirectories
      for (const size of ['main', '30', '45', '60']) {
        const { data: sizeFiles } = await supabaseAdmin.storage
          .from(MIGRATION_CONFIG.storageBuckets.coachImages)
          .list(size, { limit: 10 })
        
        console.log(`  ${size}/: ${sizeFiles?.length || 0} files`)
        if (sizeFiles && sizeFiles.length > 0) {
          console.log(`    Sample: ${sizeFiles[0].name}`)
        }
      }
    }
    
    // Check category icons bucket
    console.log('\n2️⃣ Checking category icons...')
    const { data: categoryFiles, error: categoryError } = await supabaseAdmin.storage
      .from(MIGRATION_CONFIG.storageBuckets.categoryIcons)
      .list('', { limit: 100 })
    
    if (categoryError) {
      console.error('Error listing category icons:', categoryError)
    } else {
      console.log(`Found ${categoryFiles?.length || 0} items in category-icons bucket`)
      
      // Check main directory
      const { data: mainFiles } = await supabaseAdmin.storage
        .from(MIGRATION_CONFIG.storageBuckets.categoryIcons)
        .list('main', { limit: 10 })
      
      console.log(`  main/: ${mainFiles?.length || 0} files`)
      if (mainFiles && mainFiles.length > 0) {
        console.log(`    Sample: ${mainFiles[0].name}`)
      }
    }
    
    // Test a few specific image URLs
    console.log('\n3️⃣ Testing sample image URLs...')
    
    const testUrls = [
      `${supabaseAdmin.storage.from(MIGRATION_CONFIG.storageBuckets.coachImages).getPublicUrl('main/image_18.jpe').data.publicUrl}`,
      `${supabaseAdmin.storage.from(MIGRATION_CONFIG.storageBuckets.categoryIcons).getPublicUrl('main/image_1.png').data.publicUrl}`
    ]
    
    for (const url of testUrls) {
      try {
        const response = await fetch(url, { method: 'HEAD' })
        console.log(`${response.ok ? '✅' : '❌'} ${url} (${response.status})`)
      } catch (error) {
        console.log(`❌ ${url} (Network error)`)
      }
    }
    
    console.log('\n🎉 Storage check completed!')
    
  } catch (error) {
    console.error('❌ Storage check failed:', error)
  }
}

if (require.main === module) {
  checkStorage().catch(console.error)
}