import { supabaseAdmin } from '../database'
import { ProductionImage, ImageMigrationResult } from '../types'
import { MIGRATION_CONFIG } from '../config'

export class ImageMigrator {
  
  /**
   * Upload a single image to Supabase Storage
   */
  async uploadImage(
    image: ProductionImage,
    bucket: string,
    size: 'main' | '30' | '45' | '60' = 'main'
  ): Promise<ImageMigrationResult> {
    const fileName = this.generateFileName(image, size)
    const filePath = `${size}/${fileName}`
    
    try {
      // Determine MIME type from extension
      const mimeType = this.getMimeTypeFromExtension(image.extension)
      
      // Upload image to storage
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, image.data, {
          contentType: mimeType,
          upsert: true
        })
      
      if (error) throw error
      
      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(filePath)
      
      return {
        originalId: image.id,
        fileName: filePath,
        publicUrl: urlData.publicUrl,
        size
      }
      
    } catch (error) {
      console.error(`Failed to upload image ${image.id} (${size}):`, error)
      throw error
    }
  }

  /**
   * Generate consistent file name for image
   */
  private generateFileName(image: ProductionImage, size: string): string {
    const extension = image.extension?.startsWith('.') ? image.extension : `.${image.extension || 'jpg'}`
    const baseName = `image_${image.id}`
    
    return `${baseName}_${size}${extension}`
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeTypeFromExtension(extension: string): string {
    const ext = extension.toLowerCase().replace('.', '')
    const extMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    }
    
    return extMap[ext] || 'image/jpeg'
  }

  /**
   * Migrate coach images (all 4 sizes)
   */
  async migrateCoachImages(
    coachImages: ProductionImage[]
  ): Promise<ImageMigrationResult[]> {
    console.log(`🖼️  Migrating ${coachImages.length} coach images...`)
    
    const results: ImageMigrationResult[] = []
    const bucket = MIGRATION_CONFIG.storageBuckets.coachImages
    
    // Ensure bucket exists
    await this.ensureBucketExists(bucket)
    
    for (const image of coachImages) {
      try {
        // Upload main image
        const mainResult = await this.uploadImage(image, bucket, 'main')
        results.push(mainResult)
        
        // For coach images, we also create sized versions
        // (In a real scenario, you'd resize the images, but for now we'll upload the same image)
        const sizes: Array<'30' | '45' | '60'> = ['30', '45', '60']
        
        for (const size of sizes) {
          const sizedResult = await this.uploadImage(image, bucket, size)
          results.push(sizedResult)
        }
        
        console.log(`✅ Uploaded coach image ${image.id} (${image.extension})`)
        
      } catch (error) {
        console.error(`❌ Failed to migrate coach image ${image.id}:`, error)
        // Continue with other images
      }
    }
    
    console.log(`✅ Coach image migration completed: ${results.length} files uploaded`)
    return results
  }

  /**
   * Migrate category icons
   */
  async migrateCategoryIcons(
    categoryImages: ProductionImage[]
  ): Promise<ImageMigrationResult[]> {
    console.log(`🏷️  Migrating ${categoryImages.length} category icons...`)
    
    const results: ImageMigrationResult[] = []
    const bucket = MIGRATION_CONFIG.storageBuckets.categoryIcons
    
    // Ensure bucket exists
    await this.ensureBucketExists(bucket)
    
    for (const image of categoryImages) {
      try {
        const result = await this.uploadImage(image, bucket, 'main')
        results.push(result)
        
        console.log(`✅ Uploaded category icon ${image.id} (${image.extension})`)
        
      } catch (error) {
        console.error(`❌ Failed to migrate category icon ${image.id}:`, error)
        // Continue with other images
      }
    }
    
    console.log(`✅ Category icon migration completed: ${results.length} files uploaded`)
    return results
  }

  /**
   * Ensure storage bucket exists
   */
  private async ensureBucketExists(bucketName: string): Promise<void> {
    try {
      // Try to get bucket info
      const { data, error } = await supabaseAdmin.storage.getBucket(bucketName)
      
      if (error && error.message.includes('not found')) {
        // Create bucket if it doesn't exist
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
        console.error(`Error checking bucket ${bucketName}:`, error)
      }
      
    } catch (error) {
      console.error(`Error ensuring bucket exists ${bucketName}:`, error)
    }
  }

  /**
   * Get unique image IDs from coaches and categories
   */
  getRequiredImageIds(
    coaches: any[],
    categories: any[]
  ): { coachImageIds: number[], categoryImageIds: number[] } {
    const coachImageIds = new Set<number>()
    const categoryImageIds = new Set<number>()
    
    // Collect coach image IDs
    coaches.forEach(coach => {
      [coach.image_id, coach.image30_id, coach.image45_id, coach.image60_id]
        .filter(id => id && id > 0)
        .forEach(id => coachImageIds.add(id))
    })
    
    // Collect category image IDs
    categories.forEach(category => {
      [category.icon_id, category.icon_id_secondary]
        .filter(id => id && id > 0)
        .forEach(id => categoryImageIds.add(id))
    })
    
    return {
      coachImageIds: Array.from(coachImageIds),
      categoryImageIds: Array.from(categoryImageIds)
    }
  }

  /**
   * Validate uploaded images
   */
  async validateUploads(results: ImageMigrationResult[]): Promise<{
    valid: boolean
    accessible: number
    broken: string[]
  }> {
    console.log('🔍 Validating uploaded images...')
    
    const broken: string[] = []
    let accessible = 0
    
    for (const result of results) {
      try {
        // Try to fetch the image URL to verify it's accessible
        const response = await fetch(result.publicUrl, { method: 'HEAD' })
        if (response.ok) {
          accessible++
        } else {
          broken.push(`${result.fileName}: HTTP ${response.status}`)
        }
      } catch (error) {
        broken.push(`${result.fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    return {
      valid: broken.length === 0,
      accessible,
      broken
    }
  }
}