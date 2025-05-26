#!/usr/bin/env ts-node

import { checkConnections } from './database'
import { ProductionExporter } from './exporters/production-exporter'

async function testConnections() {
  console.log('🔍 Testing database connections...\n')
  
  // Test basic connections
  const connectionsOk = await checkConnections()
  if (!connectionsOk) {
    console.error('❌ Connection test failed')
    process.exit(1)
  }
  
  console.log('\n📊 Testing production data access...')
  
  // Test production data access
  const exporter = new ProductionExporter()
  try {
    await exporter.connect()
    
    // Get data counts
    const counts = await exporter.getDataCounts()
    console.log('\nProduction data counts:')
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count} records`)
    })
    
    // Get image stats
    const imageStats = await exporter.getImageStats()
    console.log(`\nImage storage: ${imageStats.totalImages} images, ${imageStats.totalSize}`)
    
    // Validate category hierarchy
    const hierarchyValidation = await exporter.validateHierarchy()
    if (hierarchyValidation.valid) {
      console.log('✅ Category hierarchy is valid')
    } else {
      console.log('⚠️  Category hierarchy issues:')
      hierarchyValidation.issues.forEach(issue => console.log(`   - ${issue}`))
    }
    
    await exporter.disconnect()
    
    console.log('\n🎉 All connections and data access tests passed!')
    
  } catch (error) {
    console.error('❌ Production data access failed:', error)
    await exporter.disconnect()
    process.exit(1)
  }
}

testConnections().catch(console.error)