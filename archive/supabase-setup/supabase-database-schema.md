# Supabase Database Schema - Totalis

## Overview

This document defines the complete database schema for the Totalis platform on Supabase. It includes tables, relationships, indexes, and Row Level Security (RLS) policies.

## Schema Design Principles

1. **Simplicity**: Minimize table count by consolidating related data
2. **Security**: RLS policies enforce data access at database level
3. **Performance**: Strategic indexes for common query patterns
4. **Flexibility**: JSONB fields for extensible metadata
5. **Compatibility**: Support all features from mobile app dev branch

## Tables

### 1. Coaches
Stores AI coach personalities that users can select.

```sql
CREATE TABLE coaches (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Coach information
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  sex TEXT CHECK (sex IN ('male', 'female', 'non_binary', 'other')),
  year_of_birth INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_coaches_active ON coaches(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coaches" ON coaches
  FOR SELECT USING (is_active = true);
```

### 2. User Profiles
Extends Supabase auth.users with app-specific data.

```sql
CREATE TABLE user_profiles (
  -- Primary key linked to auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile data
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  year_of_birth INTEGER,
  sex TEXT CHECK (sex IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  
  -- Settings
  notification_settings JSONB DEFAULT '{}',
  mood_config JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_profiles_coach ON user_profiles(coach_id);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to create profile on user signup with default coach
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 3. Categories
Hierarchical wellness categories for organizing content.

```sql
CREATE TABLE categories (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hierarchy
  parent_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  
  -- Category info
  name TEXT NOT NULL,
  name_short TEXT,
  description TEXT,
  icon TEXT,
  
  -- Display settings
  sort_order INTEGER DEFAULT 0,
  primary_color TEXT,
  secondary_color TEXT,
  
  -- Feature flags
  is_active BOOLEAN DEFAULT true,
  show_checkin_history BOOLEAN DEFAULT false,
  checkin_enabled BOOLEAN DEFAULT true,
  followup_timer INTEGER, -- minutes until follow-up
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_sort ON categories(sort_order, name);
CREATE INDEX idx_categories_active ON categories(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT USING (is_active = true);
```

### 4. User Categories
Tracks user interactions with categories (favorites, usage).

```sql
CREATE TABLE user_categories (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  
  -- User preferences
  is_favorite BOOLEAN DEFAULT false,
  last_checkin_at TIMESTAMPTZ,
  checkin_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(user_id, category_id)
);

-- Indexes
CREATE INDEX idx_user_categories_user ON user_categories(user_id);
CREATE INDEX idx_user_categories_category ON user_categories(category_id);
CREATE INDEX idx_user_categories_favorites ON user_categories(user_id, is_favorite) WHERE is_favorite = true;

-- RLS Policies
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories" ON user_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories" ON user_categories
  FOR ALL USING (auth.uid() = user_id);
```

### 5. Messages
Unified table for all message types (chat, check-ins, feedback).

```sql
CREATE TABLE messages (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  parent_message_id UUID REFERENCES messages(id),
  
  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'voice', 'checkin', 'feedback')),
  
  -- Coach reference for AI responses
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  
  -- Metadata (flexible JSON for different message types)
  metadata JSONB DEFAULT '{}',
  -- For check-ins: { type: 'start'|'message'|'end', summary: '', insight: '', brief: '', mood: {} }
  -- For voice: { transcription_id: '', audio_url: '' }
  -- For feedback: { type: 'user_feedback' }
  
  -- Token tracking
  tokens_used INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX idx_messages_category ON messages(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_messages_content_type ON messages(content_type);
CREATE INDEX idx_messages_parent ON messages(parent_message_id) WHERE parent_message_id IS NOT NULL;

-- RLS Policies
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 6. Recommendations
AI-generated recommendations with support for multiple types and levels.

```sql
CREATE TABLE recommendations (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  checkin_message_id UUID REFERENCES messages(id),
  parent_recommendation_id UUID REFERENCES recommendations(id),
  
  -- Recommendation content
  title TEXT,
  recommendation_text TEXT NOT NULL,
  action TEXT,
  why TEXT,
  
  -- Classification
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('action', 'category')),
  -- 'action': Direct wellness activities to do
  -- 'category': Suggestions to explore other categories
  importance INTEGER CHECK (importance BETWEEN 1 AND 5),
  relevance NUMERIC(3,2) CHECK (relevance BETWEEN 0 AND 1),
  
  -- Additional data
  recommended_categories UUID[] DEFAULT '{}',
  context TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  viewed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recommendations_user ON recommendations(user_id);
CREATE INDEX idx_recommendations_type ON recommendations(recommendation_type);
CREATE INDEX idx_recommendations_parent ON recommendations(parent_recommendation_id) WHERE parent_recommendation_id IS NOT NULL;
CREATE INDEX idx_recommendations_active ON recommendations(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_recommendations_checkin ON recommendations(checkin_message_id) WHERE checkin_message_id IS NOT NULL;

-- RLS Policies
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations" ON recommendations
  FOR UPDATE USING (auth.uid() = user_id);
```

### 7. App Configuration
Store app-wide configuration and variables.

```sql
CREATE TABLE app_config (
  -- Primary key
  key TEXT PRIMARY KEY,
  
  -- Configuration data
  value JSONB NOT NULL,
  description TEXT,
  
  -- Metadata
  is_public BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample data
INSERT INTO app_config (key, value, description, is_public) VALUES
  ('shortcuts', '{"items": []}', 'Quick action shortcuts', true),
  ('ai_config', '{"model": "claude-3-sonnet", "temperature": 0.7}', 'AI model configuration', false),
  ('default_coach', '{"default_coach_id": null}', 'Default coach for new users', false);

-- RLS Policies
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public config" ON app_config
  FOR SELECT USING (is_public = true);

CREATE POLICY "Admins can manage all config" ON app_config
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

## Views

### 1. User Check-ins View
Aggregates check-in data for easy querying.

```sql
CREATE VIEW user_checkins AS
SELECT 
  m.id,
  m.user_id,
  m.category_id,
  m.created_at,
  m.metadata->>'summary' as summary,
  m.metadata->>'insight' as insight,
  m.metadata->>'brief' as brief,
  m.metadata->'mood' as mood,
  c.name as category_name,
  uc.checkin_count
FROM messages m
JOIN categories c ON c.id = m.category_id
LEFT JOIN user_categories uc ON uc.user_id = m.user_id AND uc.category_id = m.category_id
WHERE m.content_type = 'checkin' 
  AND m.metadata->>'type' = 'end';
```

### 2. User Stats View
Provides quick access to user statistics.

```sql
CREATE VIEW user_stats AS
SELECT 
  u.id as user_id,
  COUNT(DISTINCT m.id) as total_messages,
  COUNT(DISTINCT m.id) FILTER (WHERE m.content_type = 'checkin') as total_checkins,
  COUNT(DISTINCT uc.category_id) as categories_used,
  COUNT(DISTINCT uc.category_id) FILTER (WHERE uc.is_favorite) as favorite_categories,
  MAX(m.created_at) as last_activity
FROM auth.users u
LEFT JOIN messages m ON m.user_id = u.id
LEFT JOIN user_categories uc ON uc.user_id = u.id
GROUP BY u.id;
```

## Functions

### 1. Complete Check-in
Handles check-in completion with all related updates.

```sql
CREATE OR REPLACE FUNCTION complete_checkin(
  p_user_id UUID,
  p_category_id UUID,
  p_summary TEXT,
  p_insight TEXT,
  p_brief TEXT,
  p_mood JSONB
) RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Insert check-in completion message
  INSERT INTO messages (
    user_id, 
    category_id, 
    role, 
    content, 
    content_type, 
    metadata
  ) VALUES (
    p_user_id,
    p_category_id,
    'assistant',
    p_summary,
    'checkin',
    jsonb_build_object(
      'type', 'end',
      'summary', p_summary,
      'insight', p_insight,
      'brief', p_brief,
      'mood', p_mood
    )
  ) RETURNING id INTO v_message_id;
  
  -- Update user category stats
  INSERT INTO user_categories (user_id, category_id, last_checkin_at, checkin_count)
  VALUES (p_user_id, p_category_id, NOW(), 1)
  ON CONFLICT (user_id, category_id) 
  DO UPDATE SET 
    last_checkin_at = NOW(),
    checkin_count = user_categories.checkin_count + 1;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Get Category Tree
Retrieves full category hierarchy.

```sql
CREATE OR REPLACE FUNCTION get_category_tree(p_parent_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  name TEXT,
  name_short TEXT,
  level INTEGER,
  path TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE category_tree AS (
    -- Base case: root categories
    SELECT 
      c.id,
      c.parent_id,
      c.name,
      c.name_short,
      1 as level,
      ARRAY[c.name] as path
    FROM categories c
    WHERE c.parent_id IS NULL OR c.parent_id = p_parent_id
      AND c.is_active = true
    
    UNION ALL
    
    -- Recursive case
    SELECT 
      c.id,
      c.parent_id,
      c.name,
      c.name_short,
      ct.level + 1,
      ct.path || c.name
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.is_active = true
  )
  SELECT * FROM category_tree
  ORDER BY path;
END;
$$ LANGUAGE plpgsql STABLE;
```

## Relationship Design Decisions

Based on production analysis and requirements:

1. **Coach-User Relationship (ON DELETE SET NULL)**
   - Users can exist without coaches temporarily
   - Default coach assigned via trigger on user creation
   - Allows coach removal without affecting users

2. **Category Hierarchy (ON DELETE RESTRICT)**
   - Prevents deletion of categories with children
   - Maintains tree structure integrity
   - Categories are never deleted in practice

3. **Message-Coach Reference (ON DELETE SET NULL)**
   - Messages retain coach context for AI style
   - Historical messages preserved if coach removed
   - Coach_id copied from user's current coach at message creation

4. **Unified Recommendations Table**
   - Single table with `type` field ('action' or 'category')
   - Replaces two separate tables from production
   - Both types link to categories and result from check-ins

5. **Excluded Tables**
   - `tls_keyword` and `tls_category_keyword` - unused in codebase
   - `tls_image` - replaced by Supabase Storage
   - `tls_admin` - replaced by Supabase Auth roles
   - System tables - replaced by `app_config`

## Migration Notes

1. **Data Migration**: No existing user data to migrate (app not live)
2. **Test Data**: Use test client to populate sample data
3. **Indexes**: Monitor query performance and add indexes as needed
4. **RLS Testing**: Thoroughly test all RLS policies with test client
5. **Backup Strategy**: Enable Supabase's point-in-time recovery
6. **Foreign Keys**: All use appropriate ON DELETE behavior:
   - CASCADE for owned data (user → messages, categories)
   - SET NULL for references (coach assignments)
   - RESTRICT for hierarchies (category parents)

## Performance Considerations

1. **Message Pagination**: Always paginate messages (limit 50)
2. **Category Caching**: Categories change rarely, cache aggressively
3. **Real-time Subscriptions**: Subscribe only to user's own data
4. **JSONB Indexing**: Add GIN indexes if querying metadata frequently

---

*Document created: May 24, 2025*
*Purpose: Complete database schema for Totalis Supabase migration*