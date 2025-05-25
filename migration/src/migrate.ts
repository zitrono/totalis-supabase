#!/usr/bin/env ts-node

import { checkConnections, supabaseAdmin } from './database'
import { ProductionExporter } from './exporters/production-exporter'
import { ImageMigrator } from './storage/image-migrator'
import { CoachTransformer } from './transformers/coach-transformer'
import { CategoryTransformer } from './transformers/category-transformer'
import { ConfigTransformer } from './transformers/config-transformer'
import { MIGRATION_CONFIG } from './config'

async function runMigration() {
  console.log('🚀 Starting Totalis Production Data Migration\n')
  
  // Test connections first
  const connectionsOk = await checkConnections()
  if (!connectionsOk) {
    console.error('❌ Migration aborted: Connection test failed')
    process.exit(1)
  }
  
  console.log('\n📊 Exporting production data...')
  
  const exporter = new ProductionExporter()
  const imageMigrator = new ImageMigrator()
  const coachTransformer = new CoachTransformer()
  const categoryTransformer = new CategoryTransformer()
  const configTransformer = new ConfigTransformer()
  
  try {
    await exporter.connect()
    
    // 1. Export all data from production
    console.log('\n1️⃣ Exporting production data...')
    const [coaches, categories, prompts, variables, systems] = await Promise.all([
      exporter.exportCoaches(),
      exporter.exportCategories(),
      exporter.exportPrompts(),
      exporter.exportVariables(),
      exporter.exportSystem()
    ])
    
    // 2. Get required images
    console.log('\n2️⃣ Identifying required images...')
    const { coachImageIds, categoryImageIds } = imageMigrator.getRequiredImageIds(coaches, categories)
    console.log(`Found ${coachImageIds.length} coach images and ${categoryImageIds.length} category icons to migrate`)
    
    // Export images
    const [coachImages, categoryImages] = await Promise.all([
      exporter.exportImages(coachImageIds),
      exporter.exportImages(categoryImageIds)
    ])
    
    await exporter.disconnect()
    
    // 3. Migrate images to Supabase Storage
    console.log('\n3️⃣ Migrating images to Supabase Storage...')
    const [coachImageResults, categoryImageResults] = await Promise.all([
      imageMigrator.migrateCoachImages(coachImages),
      imageMigrator.migrateCategoryIcons(categoryImages)
    ])
    
    const allImageResults = [...coachImageResults, ...categoryImageResults]
    
    // Validate image uploads
    const imageValidation = await imageMigrator.validateUploads(allImageResults)
    if (!imageValidation.valid) {
      console.warn(`⚠️  ${imageValidation.broken.length} images failed validation`)
      imageValidation.broken.forEach(issue => console.warn(`   ${issue}`))
    }
    
    // 4. Transform and migrate coaches
    console.log('\n4️⃣ Transforming and migrating coaches...')
    const coachResult = coachTransformer.transformBatch(coaches, allImageResults)
    
    if (coachResult.errors.length > 0) {
      console.error('❌ Coach transformation errors:')
      coachResult.errors.forEach(error => console.error(`   ${error}`))
    }
    
    if (coachResult.warnings.length > 0) {
      console.warn('⚠️  Coach transformation warnings:')
      coachResult.warnings.forEach(warning => console.warn(`   ${warning}`))
    }
    
    // Insert coaches
    for (const coach of coachResult.coaches) {
      const { error } = await supabaseAdmin
        .from('coaches')
        .insert(coach)
      
      if (error) {
        console.error(`Failed to insert coach ${coach.name}:`, error)
      } else {
        console.log(`✅ Migrated coach: ${coach.name}`)
      }
    }
    
    // Find Daniel coach for default configuration
    const danielCoach = coachTransformer.findDanielCoach(coachResult.coaches)
    if (!danielCoach) {
      console.warn('⚠️  Daniel coach not found, using first coach as default')
    }
    
    // 5. Transform and migrate categories
    console.log('\n5️⃣ Transforming and migrating categories...')
    const categoryResult = categoryTransformer.transformBatch(categories, allImageResults)
    
    if (categoryResult.errors.length > 0) {
      console.error('❌ Category transformation errors:')
      categoryResult.errors.forEach(error => console.error(`   ${error}`))
    }
    
    if (categoryResult.warnings.length > 0) {
      console.warn('⚠️  Category transformation warnings:')
      categoryResult.warnings.forEach(warning => console.warn(`   ${warning}`))
    }
    
    // Clear existing categories (we seeded some test data)
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
        console.log(`✅ Migrated category: ${category.name}`)
      }
    }
    
    // Validate hierarchy
    const hierarchyValidation = categoryTransformer.validateHierarchy(categoryResult.categories)
    if (!hierarchyValidation.valid) {
      console.warn('⚠️  Category hierarchy issues:')
      hierarchyValidation.issues.forEach(issue => console.warn(`   ${issue}`))
    }
    
    // 6. Transform and migrate configuration
    console.log('\n6️⃣ Transforming and migrating configuration...')
    const configResult = configTransformer.transformAll(
      prompts,
      variables,
      systems,
      danielCoach?.id || coachResult.coaches[0]?.id
    )
    
    if (configResult.errors.length > 0) {
      console.error('❌ Configuration transformation errors:')
      configResult.errors.forEach(error => console.error(`   ${error}`))
    }
    
    if (configResult.warnings.length > 0) {
      console.warn('⚠️  Configuration transformation warnings:')
      configResult.warnings.forEach(warning => console.warn(`   ${warning}`))
    }
    
    // Insert configurations
    for (const config of configResult.configs) {
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
    
    console.log('\n🎉 Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Run integration tests: npm run test:scenarios')
    console.log('2. Validate data in Supabase dashboard')
    console.log('3. Proceed with Phase 4: Edge Functions')
    
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
      .select('name')
      .ilike('name', '%daniel%')
      .limit(1)
    
    if (danielCheck && danielCheck.length > 0) {
      console.log(`   ✅ Default coach (Daniel) found`)
    } else {
      console.log(`   ⚠️  Default coach (Daniel) not found`)
    }
    
  } catch (error) {
    console.error('Failed to generate summary:', error)
  }
}

if (require.main === module) {
  runMigration().catch(console.error)
}