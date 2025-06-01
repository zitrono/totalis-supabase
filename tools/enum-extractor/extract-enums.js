#!/usr/bin/env node

const { Client } = require('pg');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

/**
 * PostgreSQL Enum Extractor for Supadart
 * 
 * Automatically queries the database for all enum types and updates
 * the Supadart configuration with current enum values.
 * 
 * Usage:
 *   node extract-enums.js [config-path]
 * 
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string
 */

async function extractEnums(configPath = 'supadart.yaml') {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  console.log('🔍 Connecting to database to extract enums...');
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('supabase.co') ? { rejectUnauthorized: false } : false
  });
  
  try {
    await client.connect();
    console.log('✅ Database connected successfully');
    
    // Query to extract enum-like values from CHECK constraints
    const result = await client.query(`
      SELECT 
        tc.constraint_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
      WHERE tc.constraint_type = 'CHECK'
        AND tc.table_schema = 'public'
        AND (cc.check_clause ~ 'ANY.*ARRAY' OR cc.check_clause ~ 'IN\\s*\\(')
      ORDER BY tc.constraint_name
    `);
    
    console.log(`📊 Found ${result.rows.length} enum types in database`);
    
    const enums = {};
    result.rows.forEach(row => {
      // Parse enum values from CHECK constraint clause
      // Format: ((column = ANY (ARRAY['value1'::text, 'value2'::text, ...])))
      // or: column IN ('value1', 'value2', ...)
      const clause = row.check_clause;
      
      // Extract column name from constraint name (format: table_column_check)
      const constraintName = row.constraint_name;
      let columnName = null;
      
      // Try to extract column name from constraint name
      const nameMatch = constraintName.match(/^(.+?)_(.+?)_check$/);
      if (nameMatch) {
        columnName = nameMatch[2]; // Extract column name part
      }
      
      // Parse ARRAY[...] format
      let values = [];
      const arrayMatch = clause.match(/ARRAY\[([^\]]+)\]/i);
      if (arrayMatch) {
        const valuesString = arrayMatch[1];
        values = valuesString
          .split(',')
          .map(v => v.trim())
          .map(v => v.replace(/^['"](.*)['"]::text$/, '$1')) // Remove quotes and ::text cast
          .map(v => v.replace(/^['"](.*)['"]$/, '$1')) // Remove just quotes
          .filter(v => v && v.length > 0);
      } else {
        // Parse IN(...) format
        const inMatch = clause.match(/IN\s*\(\s*([^)]+)\s*\)/i);
        if (inMatch) {
          const valuesString = inMatch[1];
          values = valuesString
            .split(',')
            .map(v => v.trim())
            .map(v => v.replace(/^['"](.*)['"]$/, '$1')) // Remove quotes
            .filter(v => v && v.length > 0);
        }
      }
      
      if (columnName && values.length > 0) {
        // Handle conflicts by taking the most comprehensive enum (most values)
        if (enums[columnName]) {
          if (values.length > enums[columnName].length) {
            console.log(`  🔄 ${columnName}: [${values.join(', ')}] (updated - more comprehensive)`);
            enums[columnName] = values;
          } else {
            console.log(`  ⚠️ ${columnName}: [${values.join(', ')}] (skipped - less comprehensive)`);
          }
        } else {
          enums[columnName] = values;
          console.log(`  📝 ${columnName}: [${values.join(', ')}]`);
        }
      }
    });
    
    // Read existing config or create basic template
    let config = {};
    if (fs.existsSync(configPath)) {
      console.log(`📖 Reading existing config: ${configPath}`);
      config = yaml.load(fs.readFileSync(configPath, 'utf8'));
    } else {
      console.log(`📄 Creating new config: ${configPath}`);
      config = {
        supabase_url: process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL',
        supabase_anon_key: process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',
        dart_format: true,
        output: '.',
        separated: true,
        dart_class: true,
        include_views: true,
        include_enums: true
      };
    }
    
    // Update enums section
    config.enums = enums;
    
    // Write updated config
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, yaml.dump(config, {
      flowLevel: 2,
      quotingType: '"',
      forceQuotes: false
    }));
    
    console.log(`✅ Updated Supadart config with ${Object.keys(enums).length} enum types`);
    console.log(`📁 Config saved to: ${configPath}`);
    
    return enums;
    
  } catch (error) {
    console.error('❌ Error extracting enums:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// CLI execution
if (require.main === module) {
  const configPath = process.argv[2] || 'supadart.yaml';
  
  extractEnums(configPath)
    .then((enums) => {
      console.log('\n🎉 Enum extraction completed successfully!');
      console.log(`📊 Total enums: ${Object.keys(enums).length}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Enum extraction failed:', error.message);
      process.exit(1);
    });
}

module.exports = { extractEnums };