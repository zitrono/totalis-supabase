#!/usr/bin/env ts-node

import { supabaseAdmin } from './database'

async function checkDuplicates() {
  console.log('🔍 Quick Duplicate Check\n')
  
  try {
    // Get all coaches
    const { data: coaches } = await supabaseAdmin
      .from('coaches')
      .select('id, name, photo_url')
    
    console.log(`Total coach records: ${coaches?.length || 0}`)
    
    if (coaches) {
      const nameCount = new Map()
      coaches.forEach(coach => {
        nameCount.set(coach.name, (nameCount.get(coach.name) || 0) + 1)
      })
      
      console.log('\nCoach name frequencies:')
      Array.from(nameCount.entries()).forEach(([name, count]) => {
        const status = count > 1 ? '❌ DUPLICATE' : '✅'
        console.log(`  ${status} ${name}: ${count} record(s)`)
      })
    }
    
    // Get all categories  
    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('id, name, icon')
    
    console.log(`\nTotal category records: ${categories?.length || 0}`)
    
    if (categories) {
      const nameCount = new Map()
      categories.forEach(category => {
        nameCount.set(category.name, (nameCount.get(category.name) || 0) + 1)
      })
      
      const duplicates = Array.from(nameCount.entries()).filter(([_, count]) => count > 1)
      
      if (duplicates.length > 0) {
        console.log('\n❌ Category duplicates found:')
        duplicates.forEach(([name, count]) => {
          console.log(`  ${name}: ${count} records`)
        })
      } else {
        console.log('\n✅ No duplicate categories found')
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

checkDuplicates()