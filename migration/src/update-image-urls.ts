#!/usr/bin/env ts-node

import { checkConnections, supabaseAdmin } from './database'
import { ProductionExporter } from './exporters/production-exporter'
import { MIGRATION_CONFIG, CONFIG } from './config'

async function updateImageUrls() {
  console.log('🔗 Updating database records with image URLs\n')
  
  const connectionsOk = await checkConnections()
  if (!connectionsOk) {
    console.error('❌ Update aborted: Connection test failed')
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
    
    console.log('1️⃣ Updating coach photos...')
    await updateCoachPhotos(coaches)
    
    console.log('\n2️⃣ Updating category icons...')
    await updateCategoryIcons(categories)
    
    console.log('\n3️⃣ Final verification...')
    await printFinalStats()
    
    console.log('\n🎉 Image URL updates completed!')
    
  } catch (error) {
    console.error('❌ Update failed:', error)
    await exporter.disconnect()
    process.exit(1)
  }
}

async function updateCoachPhotos(coaches: any[]) {
  for (const coach of coaches) {
    try {
      // Get the main image ID (prioritize main, then 60, 45, 30)
      const imageIds = [coach.image_id, coach.image60_id, coach.image45_id, coach.image30_id]
        .filter(id => id && id > 0)
      
      if (imageIds.length === 0) {
        console.log(`⚠️  No images for coach ${coach.name}`)
        continue
      }
      
      // Try to find an uploaded image
      const baseUrl = `${CONFIG.supabase.url}/storage/v1/object/public/${MIGRATION_CONFIG.storageBuckets.coachImages}`
      let photoUrl = null
      
      for (const imageId of imageIds) {
        // Try different sizes
        for (const size of ['main', '60', '45', '30']) {
          const testUrl = `${baseUrl}/${size}/image_${imageId}.jpe`
          
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
          console.log(`✅ Updated ${coach.name} with photo`)
        }
      } else {
        console.log(`⚠️  No accessible image found for coach ${coach.name}`)
      }
      
    } catch (error) {
      console.error(`Error processing coach ${coach.name}:`, error)
    }
  }
}

async function updateCategoryIcons(categories: any[]) {
  for (const category of categories) {
    try {
      // Get icon image IDs
      const imageIds = [category.icon_id, category.icon_id_secondary]
        .filter(id => id && id > 0)
      
      if (imageIds.length === 0) {
        continue // Skip categories without icons
      }
      
      // Try to find an uploaded icon
      const baseUrl = `${CONFIG.supabase.url}/storage/v1/object/public/${MIGRATION_CONFIG.storageBuckets.categoryIcons}`
      let iconUrl = null
      
      for (const imageId of imageIds) {
        // Try different extensions
        for (const ext of ['.png', '.jpg', '.jpe']) {
          const testUrl = `${baseUrl}/main/image_${imageId}${ext}`
          
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
          console.log(`✅ Updated ${category.name} with icon`)
        }
      }
      
    } catch (error) {
      console.error(`Error processing category ${category.name}:`, error)
    }
  }
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
    
    if (categoriesWithIcons && categoriesWithIcons.length > 0) {
      console.log(`\n🏷️  Categories with icons: ${categoriesWithIcons.length} total`)
    }
    
  } catch (error) {
    console.error('Failed to generate final stats:', error)
  }
}

if (require.main === module) {
  updateImageUrls().catch(console.error)
}