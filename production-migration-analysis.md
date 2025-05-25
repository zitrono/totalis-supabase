# Production Database Migration Analysis - Phase 3 Preparation

## Production Database Overview
- **Server**: 194.163.136.137
- **Database**: PostgreSQL 15.1 (Docker)
- **Database Name**: totalis
- **User**: totalis
- **Password**: xdX87dBJWHZ

## Tables to Migrate for Phase 3

### 1. tls_coach → coaches table
**Production Structure**:
```sql
tls_coach (
  id INTEGER PRIMARY KEY,
  name TEXT,
  description TEXT,
  image_id INTEGER REFERENCES tls_image(id),
  image30_id INTEGER REFERENCES tls_image(id),
  image45_id INTEGER REFERENCES tls_image(id), 
  image60_id INTEGER REFERENCES tls_image(id),
  sex TEXT,
  intro TEXT,
  prompt TEXT,
  time_create TIMESTAMP
)
```

**Migration Requirements**:
- Extract year_of_birth from intro field (contains age/birth year info)
- Map sex field values to enum ('male', 'female', 'non_binary', 'other')
- Migrate coach images from binary storage to Supabase Storage URLs
- Set all coaches as is_active = true
- Preserve original IDs for relationship integrity

### 2. tls_category → categories table
**Production Structure**:
```sql
tls_category (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER REFERENCES tls_category(id),
  name TEXT,
  name_short TEXT,
  description TEXT,
  icon_id INTEGER REFERENCES tls_image(id),
  icon_id_secondary INTEGER REFERENCES tls_image(id),
  sort_order INTEGER,
  primary_color TEXT,
  secondary_color TEXT,
  show_checkin_history BOOLEAN,
  checkin_enabled BOOLEAN,
  followup_chat_enabled BOOLEAN,
  followup_timer INTEGER,
  prompt_checkin TEXT,
  prompt_checkin_2 TEXT,
  guidelines_file_text TEXT,
  max_questions INTEGER,
  scope TEXT,
  time_create TIMESTAMP
)
```

**Migration Requirements**:
- Maintain hierarchical structure (parent_id relationships)
- Use topological sort to preserve hierarchy during migration
- Convert icon_id references to icon paths/URLs
- Map followup_chat_enabled to appropriate fields
- Set all categories as is_active = true
- Preserve sort_order for UI consistency

### 3. tls_prompt → app_config table
**Production Structure**:
```sql
tls_prompt (
  id INTEGER PRIMARY KEY,
  name TEXT,
  prompt TEXT,
  time_create TIMESTAMP
)
```

**Migration Requirements**:
- Transform to app_config format with key: `prompt_{name}`
- Store prompt content in JSONB value field
- Set is_public = false for all prompts
- Add description: `Prompt: {name}`

### 4. tls_variable → app_config table
**Production Structure**:
```sql
tls_variable (
  id INTEGER PRIMARY KEY,
  name TEXT,
  value TEXT,
  user BOOLEAN,
  time_create TIMESTAMP
)
```

**Migration Requirements**:
- Transform to app_config format with key: `var_{name}`
- Store value in JSONB value field
- Map user field to is_public
- Add description: `Variable: {name}`

### 5. tls_system → app_config table
**Production Structure**:
```sql
tls_system (
  id INTEGER PRIMARY KEY,
  name TEXT,
  value TEXT,
  time_create TIMESTAMP
)
```

**Migration Requirements**:
- Transform to app_config format with key: `system_{name}`
- Store value in JSONB value field
- Set is_public = false for all system settings
- Add description: `System: {name}`

## Critical Data Transformations

### Image Migration Strategy
Production stores images as binary data in tls_image table. Need to:
1. Extract binary data from tls_image
2. Upload to Supabase Storage buckets:
   - Coach images → `coach-images/` bucket
   - Category icons → `category-icons/` bucket
3. Generate public URLs for storage references
4. Update migrated records with new URLs

### Coach Data Enrichment
- Parse intro field to extract birth year
- Map sex values: 'M' → 'male', 'F' → 'female', etc.
- Generate voice_id based on coach name/sex
- Create empty voice_settings JSONB

### Category Hierarchy Validation
- Verify no circular dependencies
- Ensure all parent_id references are valid
- Check for orphaned categories
- Validate sort_order continuity

### Configuration Consolidation
- Identify duplicate or conflicting settings
- Merge related configurations
- Set appropriate access levels (public/private)
- Add default_coach configuration

## Data Export Commands

```bash
# SSH into production
ssh root@194.163.136.137

# Export coach data with related images
docker exec postgres pg_dump -U totalis -d totalis \
  --table=tls_coach \
  --table=tls_image \
  --data-only \
  > coaches_with_images.sql

# Export category hierarchy
docker exec postgres pg_dump -U totalis -d totalis \
  --table=tls_category \
  --data-only \
  > categories.sql

# Export all configuration tables
docker exec postgres pg_dump -U totalis -d totalis \
  --table=tls_prompt \
  --table=tls_variable \
  --table=tls_system \
  --data-only \
  > config_data.sql

# Export schema for reference
docker exec postgres pg_dump -U totalis -d totalis \
  --schema-only \
  > totalis_schema.sql
```

## Pre-Migration Validation Queries

```sql
-- Count records to migrate
SELECT 'coaches' as table_name, COUNT(*) as count FROM tls_coach
UNION ALL
SELECT 'categories', COUNT(*) FROM tls_category
UNION ALL
SELECT 'prompts', COUNT(*) FROM tls_prompt
UNION ALL
SELECT 'variables', COUNT(*) FROM tls_variable
UNION ALL
SELECT 'system', COUNT(*) FROM tls_system;

-- Check for Daniel coach (default)
SELECT id, name FROM tls_coach WHERE name = 'Daniel';

-- Verify category hierarchy
WITH RECURSIVE tree AS (
  SELECT id, parent_id, name, 1 as level
  FROM tls_category WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.parent_id, c.name, t.level + 1
  FROM tls_category c
  JOIN tree t ON c.parent_id = t.id
)
SELECT level, COUNT(*) as categories_at_level
FROM tree
GROUP BY level
ORDER BY level;

-- Check for broken category references
SELECT c1.id, c1.name, c1.parent_id
FROM tls_category c1
LEFT JOIN tls_category c2 ON c1.parent_id = c2.id
WHERE c1.parent_id IS NOT NULL AND c2.id IS NULL;
```

## Migration Script Structure

```typescript
// migration/src/index.ts
import { exportProductionData } from './export'
import { transformCoaches } from './transformers/coaches'
import { transformCategories } from './transformers/categories'
import { transformConfig } from './transformers/config'
import { migrateImages } from './storage/images'
import { validateMigration } from './validation'

async function runMigration() {
  // 1. Export data from production
  const data = await exportProductionData()
  
  // 2. Migrate images to storage
  const imageUrls = await migrateImages(data.images)
  
  // 3. Transform and migrate coaches
  await transformCoaches(data.coaches, imageUrls)
  
  // 4. Transform and migrate categories (with hierarchy)
  await transformCategories(data.categories, imageUrls)
  
  // 5. Transform and migrate configuration
  await transformConfig(data.prompts, data.variables, data.system)
  
  // 6. Validate migration
  await validateMigration()
}
```

## Post-Migration Validation

### Required Validations:
1. **Record Counts**: Verify all records migrated
2. **Relationships**: Check foreign key integrity
3. **Hierarchy**: Validate category tree structure
4. **Images**: Confirm all images accessible via URLs
5. **Configuration**: Test config retrieval
6. **Default Coach**: Verify Daniel is set as default

### Test Queries:
```sql
-- Verify coaches
SELECT COUNT(*) as total_coaches,
       COUNT(photo_url) as coaches_with_photos,
       COUNT(CASE WHEN name = 'Daniel' THEN 1 END) as has_daniel
FROM coaches;

-- Verify category hierarchy preserved
WITH RECURSIVE tree AS (
  SELECT id, parent_id, name, 1 as level
  FROM categories WHERE parent_id IS NULL
  UNION ALL
  SELECT c.id, c.parent_id, c.name, t.level + 1
  FROM categories c
  JOIN tree t ON c.parent_id = t.id
)
SELECT COUNT(DISTINCT id) as total_categories,
       MAX(level) as max_depth
FROM tree;

-- Verify configuration
SELECT 
  COUNT(CASE WHEN key LIKE 'prompt_%' THEN 1 END) as prompts,
  COUNT(CASE WHEN key LIKE 'var_%' THEN 1 END) as variables,
  COUNT(CASE WHEN key LIKE 'system_%' THEN 1 END) as system_settings
FROM app_config;
```

## Next Steps

1. **Create Migration Scripts**:
   - Set up TypeScript project for migration
   - Create data extraction scripts
   - Build transformation functions
   - Implement validation suite

2. **Test Migration Process**:
   - Run on test data first
   - Validate all transformations
   - Check performance on full dataset

3. **Execute Migration**:
   - Export production data
   - Run migration scripts
   - Validate results
   - Update test client to use migrated data

---

*Document created: January 25, 2025*
*Purpose: Phase 3 migration preparation and analysis*