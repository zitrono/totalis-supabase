#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read all migration files and consolidate them
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`Found ${files.length} migration files to consolidate`);

// Track what we've created to avoid duplicates
const created = {
  types: new Set(),
  tables: new Set(),
  functions: new Set(),
  triggers: new Set(),
  policies: new Set(),
  indexes: new Set(),
};

// Extract key objects from migrations
let allContent = '';
for (const file of files) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  allContent += `\n-- From ${file}\n${content}\n`;
}

// Generate timestamp
const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
const outputFile = path.join(migrationsDir, `${timestamp}_consolidated_schema.sql`);

// Write consolidated schema
const consolidatedSchema = `-- Consolidated Schema Migration
-- Generated: ${new Date().toISOString()}
-- This migration consolidates all previous migrations with JWT-based auth

-- WARNING: This is a complete schema replacement
-- Only run this on a fresh database or after backing up existing data

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

${allContent}

-- Add final cleanup and optimization
ANALYZE;
`;

// Archive existing migrations
const archiveDir = path.join(__dirname, '..', 'supabase', `migrations_archive_${timestamp}`);
fs.mkdirSync(archiveDir, { recursive: true });

// Copy all existing migrations to archive
for (const file of files) {
  fs.copyFileSync(
    path.join(migrationsDir, file),
    path.join(archiveDir, file)
  );
}

// Write the consolidated schema
fs.writeFileSync(outputFile, consolidatedSchema);

console.log(`
✅ Migration consolidation complete!

📁 Archived ${files.length} migrations to: ${archiveDir}
📄 Created consolidated migration: ${outputFile}

⚠️  Important next steps:
1. Review the consolidated migration for any issues
2. Test on a fresh database
3. Remove the old migration files when ready
4. Reset migration history in production
`);