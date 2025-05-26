import { ProductionCoach, SupabaseCoach, ImageMigrationResult } from '../types'
import { UUIDGenerator, IDMapper } from '../utils/uuid-generator'

export class CoachTransformer {
  
  /**
   * Extract birth year from intro text using common patterns
   */
  private extractBirthYear(intro: string): number | null {
    if (!intro) return null
    
    // Common patterns for birth year extraction
    const patterns = [
      /born in (\d{4})/i,
      /birth year[:\s]*(\d{4})/i,
      /(\d{4})\s*birth/i,
      /age[:\s]*(\d{1,2})/i, // Convert age to birth year
      /(\d{1,2})\s*years old/i,
      /(\d{4})/g // Last resort: any 4-digit year
    ]
    
    for (const pattern of patterns) {
      const match = intro.match(pattern)
      if (match) {
        const value = parseInt(match[1])
        
        // If it looks like an age, convert to birth year
        if (value < 100) {
          const currentYear = new Date().getFullYear()
          return currentYear - value
        }
        
        // If it's a reasonable birth year (1920-2020)
        if (value >= 1920 && value <= 2020) {
          return value
        }
      }
    }
    
    return null
  }

  /**
   * Map sex field to enum values with common sense fixes
   */
  private mapSex(sex: string): 'male' | 'female' | 'non_binary' | 'other' {
    if (!sex) return 'other'
    
    const normalized = sex.toLowerCase().trim()
    
    switch (normalized) {
      case 'm':
      case 'male':
      case 'man':
        return 'male'
      case 'f':
      case 'female':
      case 'woman':
        return 'female'
      case 'nb':
      case 'non-binary':
      case 'non_binary':
      case 'nonbinary':
        return 'non_binary'
      default:
        console.warn(`Unknown sex value: "${sex}", mapping to 'other'`)
        return 'other'
    }
  }

  /**
   * Generate voice ID based on coach name and sex
   */
  private generateVoiceId(name: string, sex: 'male' | 'female' | 'non_binary' | 'other'): string {
    const baseName = name.toLowerCase().replace(/\s+/g, '_')
    const sexSuffix = sex === 'male' ? '_m' : sex === 'female' ? '_f' : '_nb'
    return `${baseName}${sexSuffix}`
  }

  /**
   * Find the photo URL for the coach from migrated images
   */
  private findPhotoUrl(coach: ProductionCoach, migratedImages: ImageMigrationResult[]): string | null {
    // Priority: main image, then 60, 45, 30
    const imageIds = [
      coach.image_id,
      coach.image60_id,
      coach.image45_id,
      coach.image30_id
    ].filter(id => id && id > 0)

    for (const imageId of imageIds) {
      const migratedImage = migratedImages.find(img => img.originalId === imageId)
      if (migratedImage) {
        return migratedImage.publicUrl
      }
    }

    return null
  }

  /**
   * Transform a production coach to Supabase format
   */
  transform(
    coach: ProductionCoach, 
    migratedImages: ImageMigrationResult[],
    idMapper?: IDMapper
  ): SupabaseCoach {
    const sex = this.mapSex(coach.sex)
    const yearOfBirth = this.extractBirthYear(coach.intro)
    const photoUrl = this.findPhotoUrl(coach, migratedImages)
    const voiceId = this.generateVoiceId(coach.name, sex)

    // Attempt to fix common data issues
    let name = coach.name?.trim()
    if (!name) {
      name = `Coach ${coach.id}` // Fallback name
      console.warn(`Coach ${coach.id} has no name, using fallback: "${name}"`)
    }

    let bio = coach.description?.trim()
    if (!bio && coach.intro) {
      bio = coach.intro.trim() // Use intro as bio if description is missing
    }
    if (!bio) {
      bio = `${name} is here to help with your wellness journey.` // Fallback bio
    }

    // Generate deterministic UUID for this coach
    const uuid = idMapper ? idMapper.getCoachUUID(coach.id) : UUIDGenerator.coachUUID(coach.id)
    if (!uuid) {
      throw new Error(`No UUID mapping found for coach ${coach.id}`)
    }

    return {
      id: uuid,
      name,
      bio,
      photo_url: photoUrl,
      sex,
      year_of_birth: yearOfBirth,
      is_active: true,
      voice_id: voiceId,
      voice_settings: {}, // Empty object for now
      created_at: coach.time_create.toISOString()
    }
  }

  /**
   * Transform multiple coaches with validation
   */
  transformBatch(
    coaches: ProductionCoach[], 
    migratedImages: ImageMigrationResult[],
    idMapper?: IDMapper
  ): { coaches: SupabaseCoach[], errors: string[], warnings: string[] } {
    const transformed: SupabaseCoach[] = []
    const errors: string[] = []
    const warnings: string[] = []

    for (const coach of coaches) {
      try {
        const transformedCoach = this.transform(coach, migratedImages, idMapper)
        
        // Validation
        if (!transformedCoach.name) {
          errors.push(`Coach ${coach.id}: Missing name`)
          continue
        }

        if (!transformedCoach.bio) {
          warnings.push(`Coach ${coach.id}: Missing bio`)
        }

        if (!transformedCoach.photo_url) {
          warnings.push(`Coach ${coach.id}: No photo available`)
        }

        transformed.push(transformedCoach)
      } catch (error) {
        errors.push(`Coach ${coach.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { coaches: transformed, errors, warnings }
  }

  /**
   * Find Daniel coach in the transformed list
   */
  findDanielCoach(coaches: SupabaseCoach[]): SupabaseCoach | null {
    return coaches.find(coach => 
      coach.name.toLowerCase().includes('daniel')
    ) || null
  }
}