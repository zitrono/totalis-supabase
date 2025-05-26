#!/usr/bin/env ts-node

import { checkConnections, supabaseAdmin } from './database'
import { ProductionExporter } from './exporters/production-exporter'
import { CoachTransformer } from './transformers/coach-transformer'
import { CategoryTransformer } from './transformers/category-transformer'
import { ConfigTransformer } from './transformers/config-transformer'
import { IDMapper } from './utils/uuid-generator'
import { MappingStore } from './storage/mapping-store'

async function runCompleteMigration() {
  console.log('🚀 Starting Complete Totalis Production Migration with UUIDs\n')
  
  // Test connections first
  const connectionsOk = await checkConnections()
  if (!connectionsOk) {
    console.error('❌ Migration aborted: Connection test failed')
    process.exit(1)
  }
  
  const exporter = new ProductionExporter()
  const coachTransformer = new CoachTransformer()
  const categoryTransformer = new CategoryTransformer()
  const configTransformer = new ConfigTransformer()
  const idMapper = new IDMapper()
  const mappingStore = new MappingStore()
  
  try {
    // Setup mapping table
    console.log('1️⃣ Setting up ID mapping infrastructure...')
    await mappingStore.createMappingTable()
    
    await exporter.connect()
    
    // 2. Export all data from production
    console.log('\n2️⃣ Exporting production data...')
    const [coaches, categories, prompts, variables, systems] = await Promise.all([
      exporter.exportCoaches(),
      exporter.exportCategories(),
      exporter.exportPrompts(),
      exporter.exportVariables(),
      exporter.exportSystem()
    ])
    
    await exporter.disconnect()
    
    // 3. Generate UUID mappings
    console.log('\n3️⃣ Generating UUID mappings...')
    idMapper.generateMappings(coaches, categories)
    
    // Store mappings in database
    await mappingStore.storeCoachMappings(idMapper.getAllCoachMappings())
    await mappingStore.storeCategoryMappings(idMapper.getAllCategoryMappings())
    
    // 4. Transform and migrate coaches
    console.log('\n4️⃣ Transforming and migrating coaches...')
    const coachResult = coachTransformer.transformBatch(coaches, [], idMapper) // No images for now
    
    if (coachResult.errors.length > 0) {
      console.error('❌ Coach transformation errors:')
      coachResult.errors.forEach(error => console.error(`   ${error}`))
    }
    
    if (coachResult.warnings.length > 0) {
      console.warn('⚠️  Coach transformation warnings:')
      coachResult.warnings.forEach(warning => console.warn(`   ${warning}`))
    }
    
    // Clear existing coaches first
    console.log('🧹 Clearing existing coaches...')
    await supabaseAdmin.from('coaches').delete().neq('id', '')
    
    // Insert coaches
    for (const coach of coachResult.coaches) {
      const { error } = await supabaseAdmin
        .from('coaches')
        .insert(coach)
      
      if (error) {
        console.error(`Failed to insert coach ${coach.name}:`, error)
      } else {
        console.log(`✅ Migrated coach: ${coach.name} (${coach.id})`)
      }
    }
    
    // Find Daniel coach for default configuration
    const danielCoach = coachTransformer.findDanielCoach(coachResult.coaches)
    console.log(`Default coach: ${danielCoach?.name || 'Not found'} (UUID: ${danielCoach?.id || 'N/A'})`)
    
    // 5. Transform and migrate categories
    console.log('\n5️⃣ Transforming and migrating categories...')
    const categoryResult = categoryTransformer.transformBatch(categories, [], idMapper) // No images for now
    
    if (categoryResult.errors.length > 0) {
      console.error('❌ Category transformation errors:')
      categoryResult.errors.forEach(error => console.error(`   ${error}`))
    }
    
    if (categoryResult.warnings.length > 0) {
      console.warn('⚠️  Category transformation warnings:')
      categoryResult.warnings.forEach(warning => console.warn(`   ${warning}`))
    }
    
    // Clear existing categories
    console.log('🧹 Clearing existing categories...')
    await supabaseAdmin.from('categories').delete().neq('id', '')
    
    // Insert categories in correct order
    for (const category of categoryResult.categories) {
      const { error } = await supabaseAdmin
        .from('categories')
        .insert(category)
      
      if (error) {
        console.error(`Failed to insert category ${category.name}:`, error)
      } else {
        console.log(`✅ Migrated category: ${category.name} (${category.id})`)
      }
    }
    
    // Validate hierarchy
    const hierarchyValidation = categoryTransformer.validateHierarchy(categoryResult.categories)
    if (!hierarchyValidation.valid) {
      console.warn('⚠️  Category hierarchy issues:')
      hierarchyValidation.issues.forEach(issue => console.warn(`   ${issue}`))
    } else {
      console.log('✅ Category hierarchy is valid')
    }
    
    // 6. Transform and migrate configuration
    console.log('\n6️⃣ Transforming and migrating configuration...')
    
    // Clear existing config first (except default_coach which may exist)
    console.log('🧹 Clearing existing configuration...')
    await supabaseAdmin.from('app_config').delete().neq('key', 'default_coach')
    
    const configResult = configTransformer.transformAll(
      prompts,
      variables,
      systems,
      danielCoach?.id
    )
    
    if (configResult.errors.length > 0) {
      console.error('❌ Configuration transformation errors:')
      configResult.errors.forEach(error => console.error(`   ${error}`))
    }
    
    if (configResult.warnings.length > 0) {
      console.warn('⚠️  Configuration transformation warnings:')
      configResult.warnings.forEach(warning => console.warn(`   ${warning}`))
    }
    
    // Update default coach config with new UUID
    if (danielCoach) {
      await supabaseAdmin
        .from('app_config')
        .upsert({
          key: 'default_coach',
          value: { 
            default_coach_id: danielCoach.id,
            description: 'Default coach assigned to new users'
          },
          description: 'Default coach for new users',
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })
      
      console.log(`✅ Updated default coach config with UUID: ${danielCoach.id}`)
    }
    
    // Insert other configurations
    for (const config of configResult.configs) {
      if (config.key === 'default_coach') continue // Already handled above
      
      const { error } = await supabaseAdmin
        .from('app_config')
        .insert(config)
      
      if (error) {
        console.error(`Failed to insert config ${config.key}:`, error)
      } else {
        console.log(`✅ Migrated config: ${config.key}`)
      }
    }
    
    // 7. Final validation and summary
    console.log('\n7️⃣ Final validation...')
    await printMigrationSummary()
    
    // Validate mappings
    const mappingValidation = await mappingStore.validateMappings()
    if (!mappingValidation.valid) {
      console.warn('⚠️  ID mapping issues:')
      mappingValidation.issues.forEach(issue => console.warn(`   ${issue}`))
    } else {
      console.log('✅ ID mappings are valid')
    }
    
    console.log('\n🎉 Complete migration finished successfully!')
    console.log('\nNext steps:')
    console.log('1. Run integration tests: npm run test:scenarios')
    console.log('2. Validate data in Supabase dashboard')
    console.log('3. Images can be migrated separately if needed')
    console.log('4. Proceed with Phase 4: Edge Functions')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    await exporter.disconnect()
    process.exit(1)
  }
}

async function printMigrationSummary() {
  try {
    // Get counts from Supabase
    const [coachesResult, categoriesResult, configResult] = await Promise.all([
      supabaseAdmin.from('coaches').select('count'),
      supabaseAdmin.from('categories').select('count'),
      supabaseAdmin.from('app_config').select('count')
    ])
    
    console.log('\n📊 Migration Summary:')
    console.log(`   Coaches: ${coachesResult.count || 0}`)
    console.log(`   Categories: ${categoriesResult.count || 0}`)
    console.log(`   Configurations: ${configResult.count || 0}`)
    
    // Check for Daniel coach
    const { data: danielCheck } = await supabaseAdmin
      .from('coaches')
      .select('name, id')
      .ilike('name', '%daniel%')
      .limit(1)
    
    if (danielCheck && danielCheck.length > 0) {
      console.log(`   ✅ Default coach (Daniel) found: ${danielCheck[0].id}`)
    } else {
      console.log(`   ⚠️  Default coach (Daniel) not found`)
    }
    
    // Sample some data
    console.log('\n📋 Sample Data:')
    
    const { data: sampleCoaches } = await supabaseAdmin
      .from('coaches')
      .select('name, sex, year_of_birth, id')
      .limit(3)
    
    if (sampleCoaches) {
      console.log('   Coaches:')
      sampleCoaches.forEach(coach => 
        console.log(`     - ${coach.name} (${coach.sex}, born ${coach.year_of_birth || 'unknown'}) [${coach.id}]`)
      )
    }
    
    const { data: sampleCategories } = await supabaseAdmin
      .from('categories')
      .select('name, parent_id, id')
      .limit(5)
    
    if (sampleCategories) {
      console.log('   Categories:')
      sampleCategories.forEach(cat => 
        console.log(`     - ${cat.name} ${cat.parent_id ? '(child)' : '(root)'} [${cat.id}]`)
      )
    }
    
    // Show mapping stats
    const mappingStore = new MappingStore()
    const stats = await mappingStore.getMappingStats()
    console.log(`\n🗂️  ID Mappings: ${stats.coaches} coaches, ${stats.categories} categories`)
    
  } catch (error) {
    console.error('Failed to generate summary:', error)
  }
}

if (require.main === module) {
  runCompleteMigration().catch(console.error)
}