#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

async function monitorTestData() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('📊 Test Data Monitor')
  console.log('===================')
  console.log(`URL: ${supabaseUrl}`)
  console.log(`Time: ${new Date().toISOString()}`)
  console.log('')

  try {
    // Get test data summary
    const { data: summary, error: summaryError } = await supabase
      .from('test_data_summary')
      .select('*')
      .order('count', { ascending: false })

    if (summaryError) {
      console.error('Failed to get test data summary:', summaryError)
      return
    }

    if (!summary || summary.length === 0) {
      console.log('✅ No test data found in database')
      return
    }

    // Display summary
    console.log('📈 Test Data by Table:')
    let totalRecords = 0
    let oldestDate: Date | null = null

    summary.forEach((row: any) => {
      console.log(`  ${row.table_name.padEnd(20)} ${row.count.toString().padStart(6)} records`)
      if (row.oldest_record) {
        console.log(`    └─ Oldest: ${new Date(row.oldest_record).toLocaleString()} (${row.age})`)
        
        const recordDate = new Date(row.oldest_record)
        if (!oldestDate || recordDate < oldestDate) {
          oldestDate = recordDate
        }
      }
      totalRecords += row.count
    })

    console.log(`\n  Total: ${totalRecords} test records`)
    if (oldestDate) {
      console.log(`  Oldest test data: ${oldestDate.toLocaleString()}`)
    }

    // Get recent test runs
    console.log('\n🏃 Recent Test Runs:')
    const { data: recentRuns } = await supabase
      .from('profiles')
      .select('metadata')
      .not('metadata->test_run_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentRuns && recentRuns.length > 0) {
      const runMap = new Map<string, { count: number, firstSeen: string }>()
      
      recentRuns.forEach((profile: any) => {
        const runId = profile.metadata?.test_run_id
        if (runId) {
          const existing = runMap.get(runId)
          if (existing) {
            existing.count++
          } else {
            runMap.set(runId, {
              count: 1,
              firstSeen: profile.metadata?.test_created_at || 'unknown'
            })
          }
        }
      })

      Array.from(runMap.entries())
        .slice(0, 5)
        .forEach(([runId, info]) => {
          console.log(`  ${runId}: ${info.count} records (started: ${info.firstSeen})`)
        })
    }

    // Get cleanup history
    console.log('\n🗑️ Recent Cleanup Operations:')
    const { data: cleanupLogs } = await supabase
      .from('test_cleanup_log')
      .select('*')
      .order('deleted_at', { ascending: false })
      .limit(5)

    if (cleanupLogs && cleanupLogs.length > 0) {
      cleanupLogs.forEach((log: any) => {
        const date = new Date(log.deleted_at).toLocaleString()
        console.log(`  ${date}: ${log.table_name} - ${log.records_deleted} records`)
        if (log.test_run_id) {
          console.log(`    └─ Test Run: ${log.test_run_id}`)
        }
      })
    } else {
      console.log('  No cleanup operations found')
    }

    // Recommendations
    console.log('\n💡 Recommendations:')
    if (totalRecords > 1000) {
      console.log('  ⚠️  High test data volume detected. Consider running cleanup.')
    }
    if (oldestDate && (Date.now() - oldestDate.getTime()) > 7 * 24 * 60 * 60 * 1000) {
      console.log('  ⚠️  Test data older than 7 days found. Consider cleanup.')
    }
    if (totalRecords === 0) {
      console.log('  ✅ Database is clean of test data.')
    } else if (totalRecords < 100) {
      console.log('  ✅ Test data volume is low and manageable.')
    }

    // Suggested cleanup command
    if (totalRecords > 0) {
      console.log('\n🔧 To clean up test data:')
      console.log('  Preview: npx tsx scripts/test/cleanup-test-data.ts --dry-run')
      console.log('  Execute: npx tsx scripts/test/cleanup-test-data.ts --older-than "1 hour"')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run monitor
monitorTestData()