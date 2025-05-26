#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

interface CleanupOptions {
  testRunId?: string
  olderThan?: string // e.g., '1 hour', '24 hours'
  dryRun?: boolean
}

async function cleanupTestData(options: CleanupOptions = {}) {
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

  console.log('🧹 Test Data Cleanup Tool')
  console.log('========================')
  console.log(`URL: ${supabaseUrl}`)
  console.log(`Dry Run: ${options.dryRun ? 'Yes' : 'No'}`)
  console.log(`Test Run ID: ${options.testRunId || 'All test runs'}`)
  console.log(`Older Than: ${options.olderThan || '24 hours'}`)
  console.log('')

  try {
    // First, get summary of test data
    console.log('📊 Current test data summary:')
    const { data: summary, error: summaryError } = await supabase
      .from('test_data_summary')
      .select('*')

    if (summaryError) {
      console.error('Failed to get test data summary:', summaryError)
    } else if (summary && summary.length > 0) {
      let totalRecords = 0
      summary.forEach((row: any) => {
        console.log(`  ${row.table_name}: ${row.count} records (oldest: ${row.age || 'unknown'})`)
        totalRecords += row.count
      })
      console.log(`  Total: ${totalRecords} test records`)
    } else {
      console.log('  No test data found')
    }

    console.log('')

    // Run cleanup
    const { data, error } = await supabase.rpc('cleanup_test_data', {
      p_test_run_id: options.testRunId || null,
      p_older_than: options.olderThan || '24 hours',
      p_dry_run: options.dryRun || false
    })

    if (error) {
      console.error('❌ Cleanup failed:', error)
      process.exit(1)
    }

    if (data && Array.isArray(data)) {
      console.log(options.dryRun ? '🔍 Cleanup preview:' : '✅ Cleanup results:')
      let totalDeleted = 0
      data.forEach((result: any) => {
        const action = options.dryRun ? 'Would delete' : 'Deleted'
        console.log(`  ${result.table_name}: ${action} ${result.records_deleted} records`)
        totalDeleted += result.records_deleted
      })
      console.log(`  Total: ${totalDeleted} records ${options.dryRun ? 'would be' : ''} deleted`)
    }

    // Show cleanup history
    if (!options.dryRun) {
      console.log('\n📜 Recent cleanup history:')
      const { data: logs } = await supabase
        .from('test_cleanup_log')
        .select('*')
        .order('deleted_at', { ascending: false })
        .limit(5)

      if (logs && logs.length > 0) {
        logs.forEach((log: any) => {
          const date = new Date(log.deleted_at).toLocaleString()
          console.log(`  ${date}: ${log.table_name} - ${log.records_deleted} records`)
        })
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const options: CleanupOptions = {}

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--test-run-id':
      options.testRunId = args[++i]
      break
    case '--older-than':
      options.olderThan = args[++i]
      break
    case '--dry-run':
      options.dryRun = true
      break
    case '--help':
      console.log(`
Test Data Cleanup Tool

Usage: npx tsx scripts/test/cleanup-test-data.ts [options]

Options:
  --test-run-id <id>   Clean up data for specific test run
  --older-than <time>  Clean up data older than specified time (default: 24 hours)
                       Examples: '1 hour', '30 minutes', '2 days'
  --dry-run            Preview what would be deleted without actually deleting
  --help               Show this help message

Examples:
  # Preview all test data cleanup
  npx tsx scripts/test/cleanup-test-data.ts --dry-run

  # Clean up all test data older than 1 hour
  npx tsx scripts/test/cleanup-test-data.ts --older-than "1 hour"

  # Clean up specific test run
  npx tsx scripts/test/cleanup-test-data.ts --test-run-id "test_1234567_abc123"
`)
      process.exit(0)
    default:
      console.error(`Unknown option: ${args[i]}`)
      process.exit(1)
  }
}

// Run cleanup
cleanupTestData(options)