#!/usr/bin/env ts-node

import { supabaseAdmin } from './database'

async function removeDuplicates() {
  console.log('🧹 Removing Duplicate Records\n')
  
  try {
    // Step 1: Remove duplicate coaches
    console.log('1️⃣ Removing duplicate coaches...')
    await removeDuplicateCoaches()
    
    // Step 2: Remove duplicate categories
    console.log('\n2️⃣ Removing duplicate categories...')
    await removeDuplicateCategories()
    
    // Step 3: Verify cleanup
    console.log('\n3️⃣ Verifying cleanup...')
    await verifyCleanup()
    
    console.log('\n🎉 Duplicate removal completed!')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  }
}

async function removeDuplicateCoaches() {
  const duplicateNames = ['Daniel', 'Sarah', 'Michael']
  
  for (const name of duplicateNames) {
    try {
      const { data: coaches } = await supabaseAdmin
        .from('coaches')
        .select('id, name, photo_url, created_at')
        .eq('name', name)
        .order('created_at', { ascending: false }) // Most recent first
      
      if (coaches && coaches.length > 1) {
        console.log(`\n  Processing ${name} (${coaches.length} records):`)
        
        // Keep the most recent one (first in the sorted list)
        const keepRecord = coaches[0]
        const deleteRecords = coaches.slice(1)
        
        console.log(`    ✅ Keeping: ${keepRecord.id} (${new Date(keepRecord.created_at).toISOString()})`)
        
        // Delete the duplicates
        for (const record of deleteRecords) {
          console.log(`    🗑️  Deleting: ${record.id} (${new Date(record.created_at).toISOString()})`)
          
          const { error } = await supabaseAdmin
            .from('coaches')
            .delete()
            .eq('id', record.id)
          
          if (error) {
            console.error(`    ❌ Failed to delete ${record.id}:`, error)
          } else {
            console.log(`    ✅ Deleted ${record.id}`)
          }
        }
      }
    } catch (error) {
      console.error(`Error processing coach ${name}:`, error)
    }
  }
}

async function removeDuplicateCategories() {
  const duplicateNames = ['Stress Management']
  
  for (const name of duplicateNames) {
    try {
      const { data: categories } = await supabaseAdmin
        .from('categories')
        .select('id, name, icon, created_at, parent_id')
        .eq('name', name)
        .order('created_at', { ascending: false }) // Most recent first
      
      if (categories && categories.length > 1) {
        console.log(`\n  Processing ${name} (${categories.length} records):`)
        
        // Keep the most recent one (first in the sorted list)
        const keepRecord = categories[0]
        const deleteRecords = categories.slice(1)
        
        console.log(`    ✅ Keeping: ${keepRecord.id} (${new Date(keepRecord.created_at).toISOString()})`)
        
        // Check if any other categories reference the duplicates as parent
        for (const record of deleteRecords) {
          // Update any child categories to point to the record we're keeping
          const { data: children } = await supabaseAdmin
            .from('categories')
            .select('id, name')
            .eq('parent_id', record.id)
          
          if (children && children.length > 0) {
            console.log(`    📋 Updating ${children.length} child categories to new parent`)
            
            for (const child of children) {
              const { error } = await supabaseAdmin
                .from('categories')
                .update({ parent_id: keepRecord.id })
                .eq('id', child.id)
              
              if (error) {
                console.error(`    ❌ Failed to update child ${child.name}:`, error)
              } else {
                console.log(`    ✅ Updated child: ${child.name}`)
              }
            }
          }
          
          // Now delete the duplicate
          console.log(`    🗑️  Deleting: ${record.id} (${new Date(record.created_at).toISOString()})`)
          
          const { error } = await supabaseAdmin
            .from('categories')
            .delete()
            .eq('id', record.id)
          
          if (error) {
            console.error(`    ❌ Failed to delete ${record.id}:`, error)
          } else {
            console.log(`    ✅ Deleted ${record.id}`)
          }
        }
      }
    } catch (error) {
      console.error(`Error processing category ${name}:`, error)
    }
  }
}

async function verifyCleanup() {
  try {
    // Check coaches again
    const { data: coaches } = await supabaseAdmin
      .from('coaches')
      .select('name')
    
    const coachNames = coaches?.map(c => c.name) || []
    const nameCount = new Map()
    coachNames.forEach(name => {
      nameCount.set(name, (nameCount.get(name) || 0) + 1)
    })
    
    const duplicateCoaches = Array.from(nameCount.entries()).filter(([_, count]) => count > 1)
    
    console.log(`Total coaches now: ${coaches?.length || 0}`)
    if (duplicateCoaches.length > 0) {
      console.log('❌ Still have duplicate coaches:')
      duplicateCoaches.forEach(([name, count]) => {
        console.log(`  ${name}: ${count}`)
      })
    } else {
      console.log('✅ No duplicate coaches remaining')
    }
    
    // Check categories
    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('name')
    
    const categoryNames = categories?.map(c => c.name) || []
    const categoryNameCount = new Map()
    categoryNames.forEach(name => {
      categoryNameCount.set(name, (categoryNameCount.get(name) || 0) + 1)
    })
    
    const duplicateCategories = Array.from(categoryNameCount.entries()).filter(([_, count]) => count > 1)
    
    console.log(`Total categories now: ${categories?.length || 0}`)
    if (duplicateCategories.length > 0) {
      console.log('❌ Still have duplicate categories:')
      duplicateCategories.forEach(([name, count]) => {
        console.log(`  ${name}: ${count}`)
      })
    } else {
      console.log('✅ No duplicate categories remaining')
    }
    
  } catch (error) {
    console.error('Error verifying cleanup:', error)
  }
}

removeDuplicates()