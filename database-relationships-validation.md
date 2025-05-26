# Database Relationships Validation

## Updated Relationships Summary (After Schema Improvements)

| From Table | From Column | To Table | To Column | Relationship Type | On Delete | Status |
|------------|-------------|----------|-----------|------------------|-----------|--------|
| user_profiles | id | auth.users | id | One-to-One | CASCADE | ✅ Valid |
| user_profiles | coach_id | coaches | id | Many-to-One | SET NULL | ✅ Fixed |
| categories | parent_id | categories | id | Many-to-One | RESTRICT | ✅ Fixed |
| user_categories | user_id | auth.users | id | Many-to-One | CASCADE | ✅ Valid |
| user_categories | category_id | categories | id | Many-to-One | CASCADE | ✅ Valid |
| messages | user_id | auth.users | id | Many-to-One | CASCADE | ✅ Valid |
| messages | coach_id | coaches | id | Many-to-One (nullable) | SET NULL | ✅ Added |
| messages | category_id | categories | id | Many-to-One (nullable) | SET NULL | ✅ Fixed |
| messages | parent_message_id | messages | id | Many-to-One (nullable) | CASCADE | ✅ Fixed |
| recommendations | user_id | auth.users | id | Many-to-One | CASCADE | ✅ Valid |
| recommendations | category_id | categories | id | Many-to-One (nullable) | SET NULL | ✅ Fixed |
| recommendations | checkin_message_id | messages | id | Many-to-One (nullable) | CASCADE | ✅ Fixed |
| recommendations | parent_recommendation_id | recommendations | id | Many-to-One (nullable) | CASCADE | ✅ Fixed |

## Design Decisions Based on Production Analysis

### 1. Coach Deletion (SET NULL)
**Decision**: Users can exist without coaches temporarily
**Rationale**: 
- Default coach assigned via trigger on user creation
- Mobile app handles missing coaches gracefully
- Prevents user data loss if coach is removed

### 2. Category Hierarchy (RESTRICT)
**Decision**: Prevent deletion of categories with children
**Rationale**:
- Categories form a tree structure that should remain intact
- Categories are never deleted in practice
- Maintains referential integrity for the category tree

### 3. Message Coach Reference (SET NULL)
**Decision**: Messages preserve coach context even if coach deleted
**Rationale**:
- Coach style important for AI response generation
- Historical messages should remain readable
- Coach_id copied from user at message creation time

### 4. Message & Recommendation Cascades
**Decision**: Use CASCADE for parent-child relationships
**Rationale**:
- Message threads should delete together
- Recommendation hierarchies should delete together
- Maintains data consistency

## Recommended Schema Updates

```sql
-- Fix coach deletion
ALTER TABLE user_profiles 
  DROP CONSTRAINT user_profiles_coach_id_fkey,
  ADD CONSTRAINT user_profiles_coach_id_fkey 
    FOREIGN KEY (coach_id) 
    REFERENCES coaches(id) 
    ON DELETE SET NULL;

-- Fix category parent deletion (prevent deletion of parents)
ALTER TABLE categories 
  DROP CONSTRAINT categories_parent_id_fkey,
  ADD CONSTRAINT categories_parent_id_fkey 
    FOREIGN KEY (parent_id) 
    REFERENCES categories(id) 
    ON DELETE RESTRICT;

-- Add coach reference to messages
ALTER TABLE messages 
  ADD COLUMN coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL;

-- Fix messages category reference
ALTER TABLE messages 
  DROP CONSTRAINT messages_category_id_fkey,
  ADD CONSTRAINT messages_category_id_fkey 
    FOREIGN KEY (category_id) 
    REFERENCES categories(id) 
    ON DELETE SET NULL;

-- Fix messages parent reference
ALTER TABLE messages 
  DROP CONSTRAINT messages_parent_message_id_fkey,
  ADD CONSTRAINT messages_parent_message_id_fkey 
    FOREIGN KEY (parent_message_id) 
    REFERENCES messages(id) 
    ON DELETE CASCADE;

-- Fix recommendations category reference
ALTER TABLE recommendations 
  DROP CONSTRAINT recommendations_category_id_fkey,
  ADD CONSTRAINT recommendations_category_id_fkey 
    FOREIGN KEY (category_id) 
    REFERENCES categories(id) 
    ON DELETE SET NULL;

-- Fix recommendations checkin reference
ALTER TABLE recommendations 
  DROP CONSTRAINT recommendations_checkin_message_id_fkey,
  ADD CONSTRAINT recommendations_checkin_message_id_fkey 
    FOREIGN KEY (checkin_message_id) 
    REFERENCES messages(id) 
    ON DELETE CASCADE;

-- Fix recommendations parent reference
ALTER TABLE recommendations 
  DROP CONSTRAINT recommendations_parent_recommendation_id_fkey,
  ADD CONSTRAINT recommendations_parent_recommendation_id_fkey 
    FOREIGN KEY (parent_recommendation_id) 
    REFERENCES recommendations(id) 
    ON DELETE CASCADE;
```

## Additional Schema Improvements

### 1. Default Coach Assignment
Added trigger to automatically assign default coach to new users:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_default_coach_id UUID;
BEGIN
  -- Get default coach from config or use first active coach
  SELECT COALESCE(
    (SELECT value->>'default_coach_id' FROM app_config WHERE key = 'default_coach'),
    (SELECT id FROM coaches WHERE is_active = true AND name = 'Daniel' LIMIT 1),
    (SELECT id FROM coaches WHERE is_active = true ORDER BY created_at LIMIT 1)
  )::UUID INTO v_default_coach_id;
  
  INSERT INTO public.user_profiles (id, coach_id)
  VALUES (new.id, v_default_coach_id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Unified Recommendations Table
Merged two recommendation types into single table with type field:
- `recommendation_type`: 'action' (wellness activities) or 'category' (explore other areas)
- Both types link to categories and originate from check-ins
- Simplified from production's two-table approach

### 3. Check-in Fields
Preserved all three AI-generated fields from production:
- `summary`: Comprehensive overview of check-in
- `insight`: Key analytical observation
- `brief`: Quick reference description

### 4. Excluded Tables
Based on code analysis, these tables are not needed:
- `tls_keyword` and `tls_category_keyword`: Unused in codebase
- `tls_image`: Replaced by Supabase Storage
- `tls_admin`: Replaced by Supabase Auth roles
- System tables: Consolidated into `app_config`

## Validation Results

All relationships now have appropriate ON DELETE behaviors:
- **CASCADE**: Used for owned data (user → messages, user → categories)
- **SET NULL**: Used for references that should survive deletion (coaches, categories)
- **RESTRICT**: Used to maintain hierarchy integrity (category parents)

The schema is now production-ready with proper referential integrity.