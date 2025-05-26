#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config()

async function runSQL(sqlFile: string) {
  const sql = fs.readFileSync(sqlFile, 'utf-8')
  
  console.log(`📝 Running SQL from ${sqlFile}...`)
  console.log(`   ${sql.split('\n').length} lines of SQL`)
  
  // Execute via direct connection
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_KEY!,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    console.error('❌ Failed to execute SQL:', response.status, response.statusText)
    const error = await response.text()
    console.error(error)
  } else {
    console.log('✅ SQL executed successfully')
    const result = await response.json()
    console.log(result)
  }
}

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('Usage: npx tsx scripts/run-sql.ts <sql-file>')
  process.exit(1)
}

runSQL(sqlFile).catch(console.error)