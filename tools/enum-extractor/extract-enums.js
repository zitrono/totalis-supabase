#!/usr/bin/env node

const { Client } = require('pg');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { promisify } = require('util');
const net = require('net');

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
  
  // Multiple strategies to force IPv4 connection for GitHub Actions
  
  // Strategy 1: Set DNS resolver to prefer IPv4
  try {
    dns.setDefaultResultOrder('ipv4first');
    console.log('✅ Set DNS to prefer IPv4');
  } catch (e) {
    console.log('⚠️ Could not set DNS order:', e.message);
  }
  
  // Strategy 2: Parse URL and resolve to IPv4 explicitly
  const url = new URL(DATABASE_URL);
  const isSupabase = url.hostname.includes('supabase.co');
  
  const resolve4 = promisify(dns.resolve4);
  let resolvedHost = url.hostname;
  
  try {
    const addresses = await resolve4(url.hostname);
    resolvedHost = addresses[0];
    console.log(`✅ Resolved ${url.hostname} to IPv4: ${resolvedHost}`);
  } catch (err) {
    console.log(`⚠️ IPv4 resolution failed, using hostname: ${err.message}`);
  }
  
  // Strategy 3: Use connection object instead of connectionString
  // This allows pg to respect the family option properly
  const connectionConfig = {
    host: resolvedHost,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1), // Remove leading slash
    user: url.username,
    password: url.password,
    ssl: isSupabase ? { rejectUnauthorized: false } : false,
    // Strategy 4: Explicitly disable IPv6 at socket level
    family: 4, // Force IPv4
    keepAlive: true,
    keepAliveInitialDelayMillis: 30000,
    // Additional timeout settings for reliability
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
    statement_timeout: 30000
  };
  
  // Strategy 5: Test network connectivity before attempting PostgreSQL connection
  const testConnection = () => {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(5000);
      
      socket.on('connect', () => {
        console.log(`✅ Network connectivity test successful to ${resolvedHost}:${connectionConfig.port}`);
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        console.log(`⚠️ Network connectivity test timeout to ${resolvedHost}:${connectionConfig.port}`);
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
      
      socket.on('error', (err) => {
        console.log(`❌ Network connectivity test failed to ${resolvedHost}:${connectionConfig.port}: ${err.message}`);
        socket.destroy();
        reject(err);
      });
      
      socket.connect(connectionConfig.port, resolvedHost);
    });
  };
  
  try {
    await testConnection();
  } catch (err) {
    console.log(`🚨 Pre-connection test failed: ${err.message}`);
    throw new Error(`Cannot reach database server at ${resolvedHost}:${connectionConfig.port} - ${err.message}`);
  }
  
  console.log(`🔌 Attempting PostgreSQL connection to ${resolvedHost}:${connectionConfig.port} (IPv4 only)`);
  
  const client = new Client(connectionConfig);
  
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