import { createHash } from 'crypto'

/**
 * Generate deterministic UUIDs for migration consistency
 * This ensures the same original ID always maps to the same UUID
 */
export class UUIDGenerator {
  
  /**
   * Generate a deterministic UUID v4-style from original ID
   * Uses SHA-256 hash to ensure consistency across migrations
   */
  static generateDeterministicUUID(type: 'coach' | 'category', originalId: number): string {
    const seed = `totalis-${type}-${originalId}`
    const hash = createHash('sha256').update(seed).digest('hex')
    
    // Format as UUID v4 (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
    const uuid = [
      hash.substr(0, 8),
      hash.substr(8, 4),
      '4' + hash.substr(13, 3), // Version 4
      ((parseInt(hash.substr(16, 1), 16) & 0x3) | 0x8).toString(16) + hash.substr(17, 3), // Variant bits
      hash.substr(20, 12)
    ].join('-')
    
    return uuid
  }

  /**
   * Generate UUID for coach
   */
  static coachUUID(originalId: number): string {
    return this.generateDeterministicUUID('coach', originalId)
  }

  /**
   * Generate UUID for category
   */
  static categoryUUID(originalId: number): string {
    return this.generateDeterministicUUID('category', originalId)
  }
}

/**
 * ID Mapping manager for tracking original -> UUID relationships
 */
export class IDMapper {
  private coachMappings = new Map<number, string>()
  private categoryMappings = new Map<number, string>()
  
  /**
   * Add coach mapping
   */
  addCoach(originalId: number, uuid: string) {
    this.coachMappings.set(originalId, uuid)
  }
  
  /**
   * Add category mapping
   */
  addCategory(originalId: number, uuid: string) {
    this.categoryMappings.set(originalId, uuid)
  }
  
  /**
   * Get coach UUID by original ID
   */
  getCoachUUID(originalId: number): string | null {
    return this.coachMappings.get(originalId) || null
  }
  
  /**
   * Get category UUID by original ID
   */
  getCategoryUUID(originalId: number): string | null {
    return this.categoryMappings.get(originalId) || null
  }
  
  /**
   * Get all coach mappings
   */
  getAllCoachMappings(): Array<{ originalId: number, uuid: string }> {
    return Array.from(this.coachMappings.entries()).map(([originalId, uuid]) => ({ originalId, uuid }))
  }
  
  /**
   * Get all category mappings
   */
  getAllCategoryMappings(): Array<{ originalId: number, uuid: string }> {
    return Array.from(this.categoryMappings.entries()).map(([originalId, uuid]) => ({ originalId, uuid }))
  }
  
  /**
   * Generate and store all mappings from data
   */
  generateMappings(coaches: any[], categories: any[]) {
    // Generate coach UUIDs
    coaches.forEach(coach => {
      const uuid = UUIDGenerator.coachUUID(coach.id)
      this.addCoach(coach.id, uuid)
    })
    
    // Generate category UUIDs
    categories.forEach(category => {
      const uuid = UUIDGenerator.categoryUUID(category.id)
      this.addCategory(category.id, uuid)
    })
    
    console.log(`Generated ${this.coachMappings.size} coach UUIDs and ${this.categoryMappings.size} category UUIDs`)
  }
}