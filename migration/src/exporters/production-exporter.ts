import { Client } from 'pg'
import { createProductionClient } from '../database'
import {
  ProductionCoach,
  ProductionCategory,
  ProductionPrompt,
  ProductionVariable,
  ProductionSystem,
  ProductionImage
} from '../types'

export class ProductionExporter {
  private client: Client | null = null

  async connect() {
    this.client = await createProductionClient()
  }

  async disconnect() {
    if (this.client) {
      await this.client.end()
      this.client = null
    }
  }

  async exportCoaches(): Promise<ProductionCoach[]> {
    if (!this.client) throw new Error('Not connected to production database')
    
    console.log('📥 Exporting coaches from production...')
    const result = await this.client.query(`
      SELECT id, name, description, image_id, image30_id, image45_id, image60_id,
             sex, intro, prompt, time_create
      FROM tls_coach
      ORDER BY id
    `)
    
    console.log(`✅ Exported ${result.rows.length} coaches`)
    return result.rows
  }

  async exportCategories(): Promise<ProductionCategory[]> {
    if (!this.client) throw new Error('Not connected to production database')
    
    console.log('📥 Exporting categories from production...')
    const result = await this.client.query(`
      SELECT id, parent_id, name, name_short, description, icon_id, icon_id_secondary,
             sort_order, primary_color, secondary_color, show_checkin_history,
             checkin_enabled, followup_chat_enabled, followup_timer,
             prompt_checkin, prompt_checkin_2, guidelines_file_text,
             max_questions, scope, time_create
      FROM tls_category
      ORDER BY sort_order, id
    `)
    
    console.log(`✅ Exported ${result.rows.length} categories`)
    return result.rows
  }

  async exportPrompts(): Promise<ProductionPrompt[]> {
    if (!this.client) throw new Error('Not connected to production database')
    
    console.log('📥 Exporting prompts from production...')
    const result = await this.client.query(`
      SELECT id, name, prompt, time_create
      FROM tls_prompt
      ORDER BY id
    `)
    
    console.log(`✅ Exported ${result.rows.length} prompts`)
    return result.rows
  }

  async exportVariables(): Promise<ProductionVariable[]> {
    if (!this.client) throw new Error('Not connected to production database')
    
    console.log('📥 Exporting variables from production...')
    const result = await this.client.query(`
      SELECT id, name, value, "user", time_create
      FROM tls_variable
      ORDER BY id
    `)
    
    console.log(`✅ Exported ${result.rows.length} variables`)
    return result.rows
  }

  async exportSystem(): Promise<ProductionSystem[]> {
    if (!this.client) throw new Error('Not connected to production database')
    
    console.log('📥 Exporting system settings from production...')
    const result = await this.client.query(`
      SELECT id, name, value, time_create
      FROM tls_system
      ORDER BY id
    `)
    
    console.log(`✅ Exported ${result.rows.length} system settings`)
    return result.rows
  }

  async exportImages(imageIds: number[]): Promise<ProductionImage[]> {
    if (!this.client) throw new Error('Not connected to production database')
    if (imageIds.length === 0) return []
    
    console.log(`📥 Exporting ${imageIds.length} images from production...`)
    const result = await this.client.query(`
      SELECT id, extension, data, time_create
      FROM tls_image
      WHERE id = ANY($1)
      ORDER BY id
    `, [imageIds])
    
    console.log(`✅ Exported ${result.rows.length} images`)
    return result.rows
  }

  async getImageStats(): Promise<{ totalImages: number, totalSize: string }> {
    if (!this.client) throw new Error('Not connected to production database')
    
    const result = await this.client.query(`
      SELECT COUNT(*) as total_images,
             pg_size_pretty(SUM(LENGTH(data))) as total_size
      FROM tls_image
    `)
    
    return {
      totalImages: parseInt(result.rows[0].total_images),
      totalSize: result.rows[0].total_size
    }
  }

  async getDataCounts(): Promise<Record<string, number>> {
    if (!this.client) throw new Error('Not connected to production database')
    
    const queries = [
      { table: 'coaches', query: 'SELECT COUNT(*) as count FROM tls_coach' },
      { table: 'categories', query: 'SELECT COUNT(*) as count FROM tls_category' },
      { table: 'prompts', query: 'SELECT COUNT(*) as count FROM tls_prompt' },
      { table: 'variables', query: 'SELECT COUNT(*) as count FROM tls_variable' },
      { table: 'system', query: 'SELECT COUNT(*) as count FROM tls_system' },
      { table: 'images', query: 'SELECT COUNT(*) as count FROM tls_image' }
    ]
    
    const counts: Record<string, number> = {}
    
    for (const { table, query } of queries) {
      const result = await this.client.query(query)
      counts[table] = parseInt(result.rows[0].count)
    }
    
    return counts
  }

  async validateHierarchy(): Promise<{ valid: boolean, issues: string[] }> {
    if (!this.client) throw new Error('Not connected to production database')
    
    const issues: string[] = []
    
    // Check for circular dependencies
    const circularResult = await this.client.query(`
      WITH RECURSIVE tree AS (
        SELECT id, parent_id, ARRAY[id] as path, 1 as depth
        FROM tls_category
        WHERE parent_id IS NULL
        
        UNION ALL
        
        SELECT c.id, c.parent_id, t.path || c.id, t.depth + 1
        FROM tls_category c
        JOIN tree t ON c.parent_id = t.id
        WHERE NOT (c.id = ANY(t.path)) AND t.depth < 10
      )
      SELECT id FROM tls_category c
      WHERE NOT EXISTS (SELECT 1 FROM tree t WHERE t.id = c.id)
    `)
    
    if (circularResult.rows.length > 0) {
      issues.push(`Found ${circularResult.rows.length} categories with circular dependencies`)
    }
    
    // Check for orphaned categories
    const orphanResult = await this.client.query(`
      SELECT c1.id, c1.name, c1.parent_id
      FROM tls_category c1
      LEFT JOIN tls_category c2 ON c1.parent_id = c2.id
      WHERE c1.parent_id IS NOT NULL AND c2.id IS NULL
    `)
    
    if (orphanResult.rows.length > 0) {
      issues.push(`Found ${orphanResult.rows.length} orphaned categories`)
    }
    
    return {
      valid: issues.length === 0,
      issues
    }
  }
}