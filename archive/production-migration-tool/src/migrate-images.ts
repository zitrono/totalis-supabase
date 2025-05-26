#!/usr/bin/env ts-node

import { checkConnections, supabaseAdmin } from './database'
import { ProductionExporter } from './exporters/production-exporter'
import { ImageMigrator } from './storage/image-migrator'
import { ImageMigrationResult } from './types'
import { MIGRATION_CONFIG } from './config'

async function runImageMigration() {
  console.log('🖼️  Starting Complete Image Migration\n')
  
  // Test connections first
  const connectionsOk = await checkConnections()
  if (!connectionsOk) {
    console.error('❌ Migration aborted: Connection test failed')
    process.exit(1)
  }
  
  const exporter = new ProductionExporter()
  const imageMigrator = new ImageMigrator()
  
  try {
    await exporter.connect()
    
    // 1. Get all coaches and categories to identify required images
    console.log('1️⃣ Identifying all coaches and categories...')
    const [coaches, categories] = await Promise.all([
      exporter.exportCoaches(),
      exporter.exportCategories()
    ])
    
    console.log(`Found ${coaches.length} coaches and ${categories.length} categories`)
    
    // 2. Get all required image IDs
    console.log('\n2️⃣ Collecting image requirements...')
    const { coachImageIds, categoryImageIds } = imageMigrator.getRequiredImageIds(coaches, categories)
    
    console.log(`Required images:`)
    console.log(`  - Coach images: ${coachImageIds.length}`)
    console.log(`  - Category images: ${categoryImageIds.length}`)
    console.log(`  - Total: ${coachImageIds.length + categoryImageIds.length}`)
    
    // 3. Export all images from production
    console.log('\n3️⃣ Exporting images from production...')
    const allImageIds = [...new Set([...coachImageIds, ...categoryImageIds])]
    const allImages = await exporter.exportImages(allImageIds)
    
    console.log(`Successfully exported ${allImages.length} images`)
    
    // Separate images by type
    const coachImages = allImages.filter(img => coachImageIds.includes(img.id))
    const categoryImages = allImages.filter(img => categoryImageIds.includes(img.id))
    
    await exporter.disconnect()
    
    // 4. Create storage buckets if they don't exist
    console.log('\n4️⃣ Setting up storage buckets...')
    await ensureBucketsExist()
    
    // 5. Migrate coach images
    console.log('\n5️⃣ Migrating coach images...')
    let coachImageResults: ImageMigrationResult[] = []
    
    if (coachImages.length > 0) {
      try {
        coachImageResults = await imageMigrator.migrateCoachImages(coachImages)
        console.log(`✅ Successfully migrated ${coachImageResults.length} coach image files`)
      } catch (error) {
        console.error('❌ Coach image migration had issues:', error)
        // Continue with individual uploads
        coachImageResults = await migrateImagesIndividually(coachImages, 'coach-images')
      }
    } else {
      console.log('No coach images to migrate')
    }
    
    // 6. Migrate category images
    console.log('\n6️⃣ Migrating category images...')
    let categoryImageResults: ImageMigrationResult[] = []
    
    if (categoryImages.length > 0) {
      try {
        categoryImageResults = await imageMigrator.migrateCategoryIcons(categoryImages)
        console.log(`✅ Successfully migrated ${categoryImageResults.length} category image files`)
      } catch (error) {
        console.error('❌ Category image migration had issues:', error)
        // Continue with individual uploads
        categoryImageResults = await migrateImagesIndividually(categoryImages, 'category-icons')
      }
    } else {
      console.log('No category images to migrate')
    }
    
    const allImageResults = [...coachImageResults, ...categoryImageResults]
    
    // 7. Validate uploads
    console.log('\n7️⃣ Validating uploaded images...')
    if (allImageResults.length > 0) {
      const validation = await imageMigrator.validateUploads(allImageResults)
      console.log(`Image validation: ${validation.accessible}/${allImageResults.length} accessible`)
      
      if (validation.broken.length > 0) {
        console.warn(`⚠️  ${validation.broken.length} images failed validation:`)
        validation.broken.slice(0, 5).forEach(issue => console.warn(`   ${issue}`))
        if (validation.broken.length > 5) {
          console.warn(`   ... and ${validation.broken.length - 5} more`)
        }
      }
    }
    
    // 8. Update database records with image URLs
    console.log('\n8️⃣ Updating database records with image URLs...')
    await updateCoachImages(coaches, coachImageResults)
    await updateCategoryImages(categories, categoryImageResults)
    
    // 9. Final summary
    console.log('\n9️⃣ Final summary...')
    await printImageMigrationSummary(allImageResults)
    
    console.log('\n🎉 Image migration completed!')
    console.log('\nNext steps:')
    console.log('1. Run integration tests to verify images are accessible')
    console.log('2. Check Supabase dashboard storage buckets')
    console.log('3. Proceed with Phase 4: Edge Functions')
    
  } catch (error) {
    console.error('❌ Image migration failed:', error)
    await exporter.disconnect()
    process.exit(1)
  }
}

async function ensureBucketsExist() {
  const buckets = [MIGRATION_CONFIG.storageBuckets.coachImages, MIGRATION_CONFIG.storageBuckets.categoryIcons]
  
  for (const bucketName of buckets) {
    try {
      const { error } = await supabaseAdmin.storage.getBucket(bucketName)
      
      if (error && error.message.includes('not found')) {
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: ['image/*']
        })
        
        if (createError) {
          console.error(`Failed to create bucket ${bucketName}:`, createError)
        } else {
          console.log(`✅ Created storage bucket: ${bucketName}`)
        }
      } else if (error) {
        console.warn(`Warning checking bucket ${bucketName}:`, error)
      } else {
        console.log(`✅ Bucket exists: ${bucketName}`)
      }
    } catch (error) {
      console.error(`Error with bucket ${bucketName}:`, error)
    }
  }
}

async function migrateImagesIndividually(images: any[], bucket: string): Promise<ImageMigrationResult[]> {
  console.log(`Attempting individual image migration for ${images.length} images...`)
  const results: ImageMigrationResult[] = []
  
  for (const image of images) {
    try {
      const fileName = `main/image_${image.id}${image.extension?.startsWith('.') ? image.extension : '.jpg'}`
      
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(fileName, image.data, {
          contentType: 'image/jpeg',
          upsert: true
        })
      
      if (error) {
        console.error(`Failed to upload image ${image.id}:`, error)
        continue
      }
      
      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(fileName)
      
      results.push({
        originalId: image.id,
        fileName,
        publicUrl: urlData.publicUrl,
        size: 'main'
      })
      
      console.log(`✅ Uploaded image ${image.id}`)
      
    } catch (error) {
      console.error(`Error uploading image ${image.id}:`, error)
    }
  }
  
  return results
}

async function updateCoachImages(coaches: any[], imageResults: ImageMigrationResult[]) {
  console.log('Updating coach records with image URLs...')
  
  for (const coach of coaches) {
    try {
      // Find the main image for this coach
      const coachImageIds = [coach.image_id, coach.image60_id, coach.image45_id, coach.image30_id]
        .filter(id => id && id > 0)
      
      let photoUrl = null
      for (const imageId of coachImageIds) {
        const imageResult = imageResults.find(img => img.originalId === imageId)
        if (imageResult) {
          photoUrl = imageResult.publicUrl
          break
        }
      }
      
      if (photoUrl) {
        // Update the coach record with the image URL
        const { error } = await supabaseAdmin
          .from('coaches')
          .update({ photo_url: photoUrl })
          .eq('name', coach.name) // Match by name since we don't have the UUID here
        
        if (error) {
          console.error(`Failed to update coach ${coach.name} image:`, error)
        } else {
          console.log(`✅ Updated coach ${coach.name} with image`)
        }
      } else {
        console.log(`⚠️  No image found for coach ${coach.name}`)
      }
      
    } catch (error) {
      console.error(`Error updating coach ${coach.name}:`, error)
    }
  }
}

async function updateCategoryImages(categories: any[], imageResults: ImageMigrationResult[]) {
  console.log('Updating category records with image URLs...')
  
  for (const category of categories) {
    try {
      // Find icon for this category
      const categoryImageIds = [category.icon_id, category.icon_id_secondary]
        .filter(id => id && id > 0)
      
      let iconUrl = null
      for (const imageId of categoryImageIds) {
        const imageResult = imageResults.find(img => img.originalId === imageId)
        if (imageResult) {
          iconUrl = imageResult.publicUrl
          break
        }
      }
      
      if (iconUrl) {
        // Update the category record with the icon URL
        const { error } = await supabaseAdmin
          .from('categories')
          .update({ icon: iconUrl })
          .eq('name', category.name) // Match by name since we don't have the UUID here
        
        if (error) {
          console.error(`Failed to update category ${category.name} icon:`, error)
        } else {
          console.log(`✅ Updated category ${category.name} with icon`)
        }
      } else {
        console.log(`⚠️  No icon found for category ${category.name}`)
      }
      
    } catch (error) {
      console.error(`Error updating category ${category.name}:`, error)
    }
  }
}

async function printImageMigrationSummary(imageResults: ImageMigrationResult[]) {
  try {
    console.log('\n📊 Image Migration Summary:')
    console.log(`   Total images uploaded: ${imageResults.length}`)
    
    // Count by bucket
    const coachImages = imageResults.filter(img => img.fileName.includes('coach-images') || img.size)
    const categoryImages = imageResults.filter(img => img.fileName.includes('category-icons'))
    
    console.log(`   Coach images: ${coachImages.length}`)
    console.log(`   Category images: ${categoryImages.length}`)
    
    // Check updated records
    const { data: coachesWithImages } = await supabaseAdmin
      .from('coaches')
      .select('name, photo_url')
      .not('photo_url', 'is', null)
    
    const { data: categoriesWithIcons } = await supabaseAdmin
      .from('categories')
      .select('name, icon')
      .not('icon', 'is', null)
    
    console.log(`   Coaches with photos: ${coachesWithImages?.length || 0}`)
    console.log(`   Categories with icons: ${categoriesWithIcons?.length || 0}`)
    
    if (coachesWithImages && coachesWithImages.length > 0) {
      console.log('\n📷 Coaches with photos:')
      coachesWithImages.slice(0, 5).forEach(coach => 
        console.log(`     - ${coach.name}`)
      )
    }
    
  } catch (error) {
    console.error('Failed to generate image summary:', error)
  }
}

if (require.main === module) {
  runImageMigration().catch(console.error)
}