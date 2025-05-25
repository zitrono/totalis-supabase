import { 
  ProductionPrompt, 
  ProductionVariable, 
  ProductionSystem, 
  SupabaseAppConfig 
} from '../types'

export class ConfigTransformer {

  /**
   * Transform prompts to app_config format
   */
  transformPrompts(prompts: ProductionPrompt[]): SupabaseAppConfig[] {
    return prompts.map(prompt => {
      const key = `prompt_${this.sanitizeKey(prompt.name)}`
      
      return {
        key,
        value: { content: prompt.prompt?.trim() || '' },
        description: `Prompt: ${prompt.name}`,
        is_public: false,
        created_at: prompt.time_create.toISOString(),
        updated_at: prompt.time_create.toISOString()
      }
    })
  }

  /**
   * Transform variables to app_config format
   */
  transformVariables(variables: ProductionVariable[]): SupabaseAppConfig[] {
    return variables.map(variable => {
      const key = `var_${this.sanitizeKey(variable.name)}`
      
      return {
        key,
        value: { content: variable.value?.trim() || '' },
        description: `Variable: ${variable.name}`,
        is_public: variable.user || false,
        created_at: variable.time_create.toISOString(),
        updated_at: variable.time_create.toISOString()
      }
    })
  }

  /**
   * Transform system settings to app_config format
   */
  transformSystem(systems: ProductionSystem[]): SupabaseAppConfig[] {
    return systems.map(system => {
      const key = `system_${this.sanitizeKey(system.name)}`
      
      return {
        key,
        value: { content: system.value?.trim() || '' },
        description: `System: ${system.name}`,
        is_public: false,
        created_at: system.time_create.toISOString(),
        updated_at: system.time_create.toISOString()
      }
    })
  }

  /**
   * Create default coach configuration
   */
  createDefaultCoachConfig(danielCoachUUID: string): SupabaseAppConfig {
    return {
      key: 'default_coach',
      value: { 
        default_coach_id: danielCoachUUID,
        description: 'Default coach assigned to new users'
      },
      description: 'Default coach for new users',
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  /**
   * Sanitize key names for consistency
   */
  private sanitizeKey(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  /**
   * Transform all configuration data with deduplication
   */
  transformAll(
    prompts: ProductionPrompt[],
    variables: ProductionVariable[],
    systems: ProductionSystem[],
    danielCoachUUID?: string
  ): { configs: SupabaseAppConfig[], errors: string[], warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []
    const allConfigs: SupabaseAppConfig[] = []

    try {
      // Transform prompts
      const transformedPrompts = this.transformPrompts(prompts)
      allConfigs.push(...transformedPrompts)
      console.log(`✅ Transformed ${transformedPrompts.length} prompts`)

      // Transform variables
      const transformedVariables = this.transformVariables(variables)
      allConfigs.push(...transformedVariables)
      console.log(`✅ Transformed ${transformedVariables.length} variables`)

      // Transform system settings
      const transformedSystems = this.transformSystem(systems)
      allConfigs.push(...transformedSystems)
      console.log(`✅ Transformed ${transformedSystems.length} system settings`)

      // Add default coach config if Daniel coach UUID is provided
      if (danielCoachUUID) {
        const defaultCoachConfig = this.createDefaultCoachConfig(danielCoachUUID)
        allConfigs.push(defaultCoachConfig)
        console.log('✅ Added default coach configuration')
      } else {
        warnings.push('No Daniel coach UUID provided, skipping default coach configuration')
      }

    } catch (error) {
      errors.push(`Configuration transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Check for key duplicates
    const keyCount = new Map<string, number>()
    allConfigs.forEach(config => {
      const count = keyCount.get(config.key) || 0
      keyCount.set(config.key, count + 1)
    })

    keyCount.forEach((count, key) => {
      if (count > 1) {
        warnings.push(`Duplicate key found: ${key} (${count} occurrences)`)
      }
    })

    // Validate critical configurations
    const criticalKeys = ['prompt_', 'var_', 'system_']
    const missingCritical = criticalKeys.filter(prefix => 
      !allConfigs.some(config => config.key.startsWith(prefix))
    )

    if (missingCritical.length > 0) {
      warnings.push(`Missing critical configuration types: ${missingCritical.join(', ')}`)
    }

    return {
      configs: allConfigs,
      errors,
      warnings
    }
  }

  /**
   * Validate configuration completeness
   */
  validateConfigs(configs: SupabaseAppConfig[]): { valid: boolean, issues: string[] } {
    const issues: string[] = []

    // Check for empty values
    const emptyConfigs = configs.filter(config => 
      !config.value || 
      (typeof config.value === 'object' && (!config.value.content || config.value.content.trim() === ''))
    )

    if (emptyConfigs.length > 0) {
      issues.push(`Found ${emptyConfigs.length} configurations with empty values`)
    }

    // Check for invalid keys
    const invalidKeys = configs.filter(config => 
      !config.key || 
      config.key.length < 2 || 
      !/^[a-z][a-z0-9_]*$/.test(config.key)
    )

    if (invalidKeys.length > 0) {
      issues.push(`Found ${invalidKeys.length} configurations with invalid keys`)
    }

    // Check for missing descriptions
    const missingDescriptions = configs.filter(config => !config.description?.trim())
    if (missingDescriptions.length > 0) {
      issues.push(`Found ${missingDescriptions.length} configurations without descriptions`)
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }

  /**
   * Get configuration statistics
   */
  getStats(configs: SupabaseAppConfig[]): {
    total: number
    byType: Record<string, number>
    public: number
    private: number
  } {
    const byType: Record<string, number> = {}
    let publicCount = 0
    let privateCount = 0

    configs.forEach(config => {
      // Count by type (prefix)
      const prefix = config.key.split('_')[0]
      byType[prefix] = (byType[prefix] || 0) + 1

      // Count by visibility
      if (config.is_public) {
        publicCount++
      } else {
        privateCount++
      }
    })

    return {
      total: configs.length,
      byType,
      public: publicCount,
      private: privateCount
    }
  }
}