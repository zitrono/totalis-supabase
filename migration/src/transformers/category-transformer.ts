import { ProductionCategory, SupabaseCategory, ImageMigrationResult } from '../types'
import { UUIDGenerator, IDMapper } from '../utils/uuid-generator'

export class CategoryTransformer {
  
  /**
   * Sort categories in topological order to preserve hierarchy during migration
   */
  topologicalSort(categories: ProductionCategory[]): ProductionCategory[] {
    const sorted: ProductionCategory[] = []
    const visited = new Set<number>()
    const temp = new Set<number>()
    
    // Create lookup map
    const categoryMap = new Map<number, ProductionCategory>()
    categories.forEach(cat => categoryMap.set(cat.id, cat))
    
    const visit = (category: ProductionCategory) => {
      if (temp.has(category.id)) {
        console.warn(`Circular dependency detected for category ${category.id} (${category.name})`)
        return // Skip circular dependencies
      }
      
      if (visited.has(category.id)) return
      
      temp.add(category.id)
      
      // Visit parent first if exists
      if (category.parent_id && categoryMap.has(category.parent_id)) {
        const parent = categoryMap.get(category.parent_id)!
        visit(parent)
      }
      
      temp.delete(category.id)
      visited.add(category.id)
      sorted.push(category)
    }
    
    // Start with root categories (no parent)
    const rootCategories = categories.filter(cat => !cat.parent_id)
    rootCategories.forEach(visit)
    
    // Then visit any remaining categories
    categories.forEach(cat => {
      if (!visited.has(cat.id)) {
        visit(cat)
      }
    })
    
    return sorted
  }

  /**
   * Find icon URL for category from migrated images
   */
  private findIconUrl(category: ProductionCategory, migratedImages: ImageMigrationResult[]): string | null {
    // Priority: main icon, then secondary
    const imageIds = [category.icon_id, category.icon_id_secondary].filter(id => id && id > 0)
    
    for (const imageId of imageIds) {
      const migratedImage = migratedImages.find(img => img.originalId === imageId)
      if (migratedImage) {
        return migratedImage.publicUrl
      }
    }
    
    return null
  }

  /**
   * Validate and fix category data with common sense
   */
  private validateAndFix(category: ProductionCategory): {
    valid: boolean
    fixes: string[]
    category: ProductionCategory
  } {
    const fixes: string[] = []
    const fixed = { ...category }
    
    // Fix missing name
    if (!fixed.name?.trim()) {
      fixed.name = `Category ${fixed.id}`
      fixes.push(`Added fallback name: "${fixed.name}"`)
    }
    
    // Fix negative sort order
    if (fixed.sort_order < 0) {
      fixed.sort_order = 0
      fixes.push(`Fixed negative sort_order: ${category.sort_order} -> 0`)
    }
    
    // Ensure reasonable max_questions
    if (fixed.max_questions && (fixed.max_questions < 1 || fixed.max_questions > 20)) {
      const oldValue = fixed.max_questions
      fixed.max_questions = Math.max(1, Math.min(20, fixed.max_questions))
      fixes.push(`Fixed max_questions: ${oldValue} -> ${fixed.max_questions}`)
    }
    
    // Fix invalid timer values
    if (fixed.followup_timer && fixed.followup_timer < 0) {
      fixed.followup_timer = 0
      fixes.push('Fixed negative followup_timer to 0')
    }
    
    return {
      valid: true, // We can fix most issues
      fixes,
      category: fixed
    }
  }

  /**
   * Transform a production category to Supabase format
   */
  transform(
    category: ProductionCategory,
    migratedImages: ImageMigrationResult[],
    idMapper?: IDMapper
  ): SupabaseCategory {
    const validation = this.validateAndFix(category)
    const fixed = validation.category
    
    if (validation.fixes.length > 0) {
      console.log(`Category ${category.id} fixes:`, validation.fixes)
    }
    
    const iconUrl = this.findIconUrl(fixed, migratedImages)
    
    // Generate deterministic UUID for this category
    const uuid = idMapper ? idMapper.getCategoryUUID(fixed.id) : UUIDGenerator.categoryUUID(fixed.id)
    if (!uuid) {
      throw new Error(`No UUID mapping found for category ${fixed.id}`)
    }
    
    // Handle parent ID mapping
    let parentUuid: string | null = null
    if (fixed.parent_id) {
      parentUuid = idMapper ? idMapper.getCategoryUUID(fixed.parent_id) : UUIDGenerator.categoryUUID(fixed.parent_id)
      if (!parentUuid) {
        console.warn(`Parent category ${fixed.parent_id} not found for category ${fixed.id}, setting as root`)
      }
    }
    
    return {
      id: uuid,
      parent_id: parentUuid,
      name: fixed.name.trim(),
      name_short: fixed.name_short?.trim() || null,
      description: fixed.description?.trim() || null,
      icon: iconUrl,
      sort_order: fixed.sort_order || 0,
      primary_color: fixed.primary_color?.trim() || null,
      secondary_color: fixed.secondary_color?.trim() || null,
      is_active: true,
      show_checkin_history: fixed.show_checkin_history || false,
      checkin_enabled: fixed.checkin_enabled !== false, // Default to true
      followup_timer: fixed.followup_timer || null,
      prompt_checkin: fixed.prompt_checkin?.trim() || null,
      prompt_checkin_2: fixed.prompt_checkin_2?.trim() || null,
      guidelines_file_text: fixed.guidelines_file_text?.trim() || null,
      max_questions: fixed.max_questions || null,
      scope: fixed.scope?.trim() || null,
      created_at: fixed.time_create.toISOString()
    }
  }

  /**
   * Transform categories in correct order with hierarchy validation
   */
  transformBatch(
    categories: ProductionCategory[],
    migratedImages: ImageMigrationResult[],
    idMapper?: IDMapper
  ): { categories: SupabaseCategory[], errors: string[], warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    
    // First sort in topological order
    const sortedCategories = this.topologicalSort(categories)
    console.log(`Sorted ${sortedCategories.length} categories in topological order`)
    
    const transformed: SupabaseCategory[] = []
    
    for (const category of sortedCategories) {
      try {
        const transformedCategory = this.transform(category, migratedImages, idMapper)
        
        // Additional validation
        if (!transformedCategory.name) {
          errors.push(`Category ${category.id}: Missing name`)
          continue
        }
        
        // Check if parent exists in our transformed list (for validation)
        if (transformedCategory.parent_id) {
          const parentExists = transformed.some(cat => cat.id === transformedCategory.parent_id)
          if (!parentExists) {
            // Check if parent will be processed later
            const parentIdNum = transformedCategory.parent_id.replace('category_', '')
            const parentInOriginal = categories.find(cat => cat.id.toString() === parentIdNum)
            if (!parentInOriginal) {
              warnings.push(`Category ${category.id}: Parent ${transformedCategory.parent_id} not found, setting as root category`)
              transformedCategory.parent_id = null
            }
          }
        }
        
        if (!transformedCategory.icon) {
          warnings.push(`Category ${category.id}: No icon available`)
        }
        
        transformed.push(transformedCategory)
        
      } catch (error) {
        errors.push(`Category ${category.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    return { categories: transformed, errors, warnings }
  }

  /**
   * Validate hierarchy integrity after transformation
   */
  validateHierarchy(categories: SupabaseCategory[]): { valid: boolean, issues: string[] } {
    const issues: string[] = []
    const categoryIds = new Set(categories.map(cat => cat.id))
    
    // Check for orphaned categories
    for (const category of categories) {
      if (category.parent_id && !categoryIds.has(category.parent_id)) {
        issues.push(`Category ${category.id} (${category.name}) references non-existent parent ${category.parent_id}`)
      }
    }
    
    // Check for circular dependencies (simplified check)
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    
    const hasCircularDependency = (categoryId: string): boolean => {
      if (recursionStack.has(categoryId)) return true
      if (visited.has(categoryId)) return false
      
      visited.add(categoryId)
      recursionStack.add(categoryId)
      
      const category = categories.find(cat => cat.id === categoryId)
      if (category?.parent_id) {
        if (hasCircularDependency(category.parent_id)) {
          return true
        }
      }
      
      recursionStack.delete(categoryId)
      return false
    }
    
    for (const category of categories) {
      if (hasCircularDependency(category.id)) {
        issues.push(`Circular dependency detected for category ${category.id} (${category.name})`)
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    }
  }
}