#!/usr/bin/env ts-node

import { checkConnections, supabaseAdmin } from './database'
import { ProductionExporter } from './exporters/production-exporter'
import { MIGRATION_CONFIG } from './config'

async function fixImageUrls() {
  console.log('🔗 Fixing database records with correct image URLs\n')
  
  const connectionsOk = await checkConnections()
  if (!connectionsOk) {
    console.error('❌ Fix aborted: Connection test failed')
    process.exit(1)
  }
  
  const exporter = new ProductionExporter()
  
  try {
    await exporter.connect()
    
    // Get original data to map image IDs
    const [coaches, categories] = await Promise.all([
      exporter.exportCoaches(),
      exporter.exportCategories()
    ])
    
    await exporter.disconnect()
    
    console.log('1️⃣ Fixing coach photos...')
    await fixCoachPhotos(coaches)
    
    console.log('\n2️⃣ Fixing category icons...')
    await fixCategoryIcons(categories)
    
    console.log('\n3️⃣ Final verification...')
    await printFinalStats()
    
    console.log('\n🎉 Image URL fixes completed!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
    await exporter.disconnect()
    process.exit(1)
  }
}

async function fixCoachPhotos(coaches: any[]) {
  for (const coach of coaches) {
    try {
      // Get the main image ID (prioritize main, then 60, 45, 30)
      const imageIds = [coach.image_id, coach.image60_id, coach.image45_id, coach.image30_id]
        .filter(id => id && id > 0)
      
      if (imageIds.length === 0) {
        console.log(`⚠️  No images for coach ${coach.name}`)
        continue
      }
      
      let photoUrl = null
      
      // Try to find an uploaded image with the correct naming pattern
      for (const imageId of imageIds) {
        // Try different sizes - the files are named like image_18_main.jpe
        for (const size of ['main', '60', '45', '30']) {
          const fileName = `image_${imageId}_${size}.jpe`
          const testUrl = supabaseAdmin.storage
            .from(MIGRATION_CONFIG.storageBuckets.coachImages)
            .getPublicUrl(`${size}/${fileName}`)
            .data.publicUrl
          
          try {
            const response = await fetch(testUrl, { method: 'HEAD' })
            if (response.ok) {
              photoUrl = testUrl
              break
            }
          } catch (error) {
            // Continue to next URL
          }
        }
        if (photoUrl) break
      }
      
      if (photoUrl) {
        // Update the coach record
        const { error } = await supabaseAdmin
          .from('coaches')
          .update({ photo_url: photoUrl })
          .eq('name', coach.name)
        
        if (error) {
          console.error(`Failed to update coach ${coach.name}:`, error)
        } else {
          console.log(`✅ Updated ${coach.name} with photo: ${photoUrl}`)
        }
      } else {
        console.log(`⚠️  No accessible image found for coach ${coach.name}`)
      }
      
    } catch (error) {
      console.error(`Error processing coach ${coach.name}:`, error)
    }
  }
}

async function fixCategoryIcons(categories: any[]) {
  let updated = 0
  
  for (const category of categories) {
    try {
      // Get icon image IDs
      const imageIds = [category.icon_id, category.icon_id_secondary]
        .filter(id => id && id > 0)
      
      if (imageIds.length === 0) {
        continue // Skip categories without icons
      }
      
      let iconUrl = null
      
      // Try to find an uploaded icon with the correct naming pattern
      for (const imageId of imageIds) {
        // Try different extensions - files are named like image_100_main.png
        for (const ext of ['png', 'jpg', 'jpe']) {
          const fileName = `image_${imageId}_main.${ext}`
          const testUrl = supabaseAdmin.storage
            .from(MIGRATION_CONFIG.storageBuckets.categoryIcons)
            .getPublicUrl(`main/${fileName}`)
            .data.publicUrl
          
          try {
            const response = await fetch(testUrl, { method: 'HEAD' })
            if (response.ok) {
              iconUrl = testUrl
              break
            }
          } catch (error) {
            // Continue to next URL
          }
        }
        if (iconUrl) break
      }
      
      if (iconUrl) {
        // Update the category record
        const { error } = await supabaseAdmin
          .from('categories')
          .update({ icon: iconUrl })
          .eq('name', category.name)
        
        if (error) {
          console.error(`Failed to update category ${category.name}:`, error)
        } else {
          updated++
          if (updated <= 5) {
            console.log(`✅ Updated ${category.name} with icon`)
          } else if (updated === 6) {
            console.log(`✅ ... continuing to update more categories`)
          }
        }
      }
      
    } catch (error) {
      console.error(`Error processing category ${category.name}:`, error)
    }
  }
  
  console.log(`✅ Updated ${updated} categories with icons`)
}

async function printFinalStats() {
  try {
    // Count coaches with photos
    const { data: coachesWithPhotos } = await supabaseAdmin
      .from('coaches')
      .select('name, photo_url')
      .not('photo_url', 'is', null)
    
    // Count categories with icons
    const { data: categoriesWithIcons } = await supabaseAdmin
      .from('categories')
      .select('name, icon')
      .not('icon', 'is', null)
    
    console.log('\n📊 Final Statistics:')
    console.log(`   Coaches with photos: ${coachesWithPhotos?.length || 0}/8`)
    console.log(`   Categories with icons: ${categoriesWithIcons?.length || 0}/89`)
    
    if (coachesWithPhotos && coachesWithPhotos.length > 0) {
      console.log('\n👥 Coaches with photos:')
      coachesWithPhotos.forEach(coach => {
        console.log(`   - ${coach.name}`)
      })
    }
    
    console.log(`\n🎯 Image Migration Success Rate:`)
    console.log(`   Coach images: ${Math.round((coachesWithPhotos?.length || 0) / 8 * 100)}%`)
    console.log(`   Category icons: ${Math.round((categoriesWithIcons?.length || 0) / 89 * 100)}%`)
    
  } catch (error) {
    console.error('Failed to generate final stats:', error)
  }
}

if (require.main === module) {
  fixImageUrls().catch(console.error)
}