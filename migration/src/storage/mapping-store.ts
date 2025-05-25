import { supabaseAdmin } from '../database'

/**
 * Store and manage ID mappings in Supabase
 */
export class MappingStore {
  
  /**
   * Create the id_mappings table if it doesn't exist
   */
  async createMappingTable(): Promise<void> {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS id_mappings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            entity_type TEXT NOT NULL,
            original_id INTEGER NOT NULL,
            uuid_id UUID NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(entity_type, original_id)
          );
          
          CREATE INDEX IF NOT EXISTS idx_id_mappings_lookup 
          ON id_mappings(entity_type, original_id);
          
          CREATE INDEX IF NOT EXISTS idx_id_mappings_uuid 
          ON id_mappings(uuid_id);
        `
      })
      
      if (error) {
        console.error('Error creating mapping table:', error)
      } else {
        console.log('✅ ID mappings table ready')
      }
    } catch (error) {
      console.error('Failed to create mapping table:', error)
    }
  }
  
  /**
   * Store coach mappings
   */
  async storeCoachMappings(mappings: Array<{ originalId: number, uuid: string }>): Promise<void> {
    console.log(`Storing ${mappings.length} coach mappings...`)
    
    for (const mapping of mappings) {
      const { error } = await supabaseAdmin
        .from('id_mappings')
        .upsert({
          entity_type: 'coach',
          original_id: mapping.originalId,
          uuid_id: mapping.uuid
        }, { onConflict: 'entity_type,original_id' })
      
      if (error) {
        console.error(`Failed to store coach mapping ${mapping.originalId}:`, error)
      }
    }
    
    console.log('✅ Coach mappings stored')
  }
  
  /**
   * Store category mappings
   */
  async storeCategoryMappings(mappings: Array<{ originalId: number, uuid: string }>): Promise<void> {
    console.log(`Storing ${mappings.length} category mappings...`)
    
    for (const mapping of mappings) {
      const { error } = await supabaseAdmin
        .from('id_mappings')
        .upsert({
          entity_type: 'category',
          original_id: mapping.originalId,
          uuid_id: mapping.uuid
        }, { onConflict: 'entity_type,original_id' })
      
      if (error) {
        console.error(`Failed to store category mapping ${mapping.originalId}:`, error)
      }
    }
    
    console.log('✅ Category mappings stored')
  }
  
  /**
   * Get coach UUID by original ID
   */
  async getCoachUUID(originalId: number): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from('id_mappings')
      .select('uuid_id')
      .eq('entity_type', 'coach')
      .eq('original_id', originalId)
      .single()
    
    if (error || !data) return null
    return data.uuid_id
  }
  
  /**
   * Get category UUID by original ID
   */
  async getCategoryUUID(originalId: number): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from('id_mappings')
      .select('uuid_id')
      .eq('entity_type', 'category')
      .eq('original_id', originalId)
      .single()
    
    if (error || !data) return null
    return data.uuid_id
  }
  
  /**
   * Get mapping statistics
   */
  async getMappingStats(): Promise<{ coaches: number, categories: number }> {
    const [coachResult, categoryResult] = await Promise.all([
      supabaseAdmin
        .from('id_mappings')
        .select('count')
        .eq('entity_type', 'coach'),
      supabaseAdmin
        .from('id_mappings')
        .select('count')
        .eq('entity_type', 'category')
    ])
    
    return {
      coaches: coachResult.count || 0,
      categories: categoryResult.count || 0
    }
  }
  
  /**
   * Validate mappings are consistent
   */
  async validateMappings(): Promise<{ valid: boolean, issues: string[] }> {
    const issues: string[] = []
    
    try {
      // Check for duplicate UUIDs
      const { data: duplicates } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          SELECT uuid_id, COUNT(*) as count
          FROM id_mappings
          GROUP BY uuid_id
          HAVING COUNT(*) > 1
        `
      })
      
      if (duplicates && duplicates.length > 0) {
        issues.push(`Found ${duplicates.length} duplicate UUIDs in mappings`)
      }
      
      // Check for orphaned mappings (UUIDs not in actual tables)
      const { data: orphanedCoaches } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          SELECT m.uuid_id, m.original_id
          FROM id_mappings m
          LEFT JOIN coaches c ON m.uuid_id = c.id
          WHERE m.entity_type = 'coach' AND c.id IS NULL
        `
      })
      
      if (orphanedCoaches && orphanedCoaches.length > 0) {
        issues.push(`Found ${orphanedCoaches.length} orphaned coach mappings`)
      }
      
      const { data: orphanedCategories } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          SELECT m.uuid_id, m.original_id
          FROM id_mappings m
          LEFT JOIN categories c ON m.uuid_id = c.id
          WHERE m.entity_type = 'category' AND c.id IS NULL
        `
      })
      
      if (orphanedCategories && orphanedCategories.length > 0) {
        issues.push(`Found ${orphanedCategories.length} orphaned category mappings`)
      }
      
    } catch (error) {
      issues.push(`Validation query failed: ${error}`)
    }
    
    return {
      valid: issues.length === 0,
      issues
    }
  }
}