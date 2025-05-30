# Database Views Catalog for Totalis Supabase Backend

This document provides a complete catalog of all database views available in the Totalis Supabase backend, their schemas, purposes, and optimal usage patterns for direct mobile client integration.

## Table of Contents
1. [User & Profile Views](#user--profile-views)
2. [Category Views](#category-views)
3. [Message Views](#message-views)
4. [Check-in Views](#check-in-views)
5. [Recommendation Views](#recommendation-views)
6. [Analytics Views](#analytics-views)

## User & Profile Views

### 1. `user_profiles_with_coaches`
**Purpose**: Provides complete user profile information with coach details in a single query.

**Schema**:
```sql
SELECT 
  p.*,                          -- All profile columns
  c.name as coach_name,
  c.photo_url as coach_avatar,
  c.bio as coach_bio,
  c.sex as coach_sex,
  c.year_of_birth as coach_year_of_birth
FROM profiles p
LEFT JOIN coaches c ON p.coach_id = c.id;
```

**Mobile Usage**:
```dart
// Fetch current user's profile with coach info
final profile = await supabase
  .from('user_profiles_with_coaches')
  .select()
  .eq('id', userId)
  .single();
```

**Benefits**:
- Single query for profile + coach data
- Reduces network calls
- Coach info automatically included

### 2. `user_profiles_normalized`
**Purpose**: Provides normalized profile data with consistent data types and legacy compatibility.

**Schema**:
```sql
SELECT 
  id as user_id,
  id,
  name,
  email,
  phone_number,
  year_of_birth,
  year_of_birth as birth_year,  -- Alias for app compatibility
  CASE 
    WHEN sex IN ('male', 'female', 'non-binary') THEN sex
    WHEN sex = 'M' THEN 'male'
    WHEN sex = 'F' THEN 'female'
    WHEN sex = 'N' THEN 'non-binary'
    ELSE 'non-binary'
  END as gender,
  sex as gender_raw,             -- Keep original value
  coach_id,
  image_url,
  created_at,
  updated_at,
  metadata
FROM profiles;
```

**Mobile Usage**:
```dart
// Get normalized profile data
final profile = await supabase
  .from('user_profiles_normalized')
  .select()
  .eq('user_id', userId)
  .single();

// Access normalized gender field
String gender = profile['gender']; // Always 'male', 'female', or 'non-binary'
```

**Benefits**:
- Handles legacy sex/gender enum conversions
- Provides consistent data format
- Includes both `user_id` and `id` for compatibility

### 3. `user_stats`
**Purpose**: Aggregated statistics for user activity across the platform.

**Schema**:
```sql
SELECT 
  u.id as user_id,
  COUNT(DISTINCT m.id) as total_messages,
  COUNT(DISTINCT c.id) as total_checkins,
  COUNT(DISTINCT pc.category_id) as categories_used,
  COUNT(DISTINCT pc.category_id) FILTER (WHERE pc.is_favorite) as favorite_categories,
  MAX(GREATEST(m.created_at, c.completed_at)) as last_activity
FROM auth.users u
LEFT JOIN messages m ON m.user_id = u.id
LEFT JOIN checkins c ON c.user_id = u.id AND c.status = 'completed'
LEFT JOIN profile_categories pc ON pc.user_id = u.id
GROUP BY u.id;
```

**Mobile Usage**:
```dart
// Get user statistics
final stats = await supabase
  .from('user_stats')
  .select()
  .eq('user_id', userId)
  .single();

// Display in profile
Text('Total Messages: ${stats['total_messages']}');
Text('Check-ins Completed: ${stats['total_checkins']}');
```

**Benefits**:
- Pre-aggregated stats reduce computation
- Single query for dashboard data
- Includes last activity timestamp

## Category Views

### 4. `categories_with_user_preferences`
**Purpose**: Categories with user-specific preferences (favorites, selection status).

**Schema**:
```sql
SELECT 
  c.*,                           -- All category columns
  pc.user_id,
  pc.is_favorite,
  pc.created_at as added_at,
  CASE WHEN pc.user_id IS NOT NULL THEN true ELSE false END as is_selected
FROM categories c
LEFT JOIN profile_categories pc ON c.id = pc.category_id;
```

**Mobile Usage**:
```dart
// Get all categories with user preferences
final categories = await supabase
  .from('categories_with_user_preferences')
  .select()
  .eq('user_id', userId)
  .eq('is_active', true)
  .order('sort_order');

// Filter favorites
final favorites = categories.where((c) => c['is_favorite'] == true).toList();
```

**Benefits**:
- Single query for categories + user preferences
- Automatic `is_selected` flag
- Includes when user added category

## Message Views

### 5. `messages_with_coach`
**Purpose**: Messages with sender information (coach or user) for chat display.

**Schema**:
```sql
SELECT 
  m.*,                           -- All message columns
  CASE 
    WHEN m.role = 'assistant' THEN c.name
    ELSE p.name
  END as sender_name,
  CASE 
    WHEN m.role = 'assistant' THEN c.photo_url
    ELSE NULL
  END as sender_avatar
FROM messages m
JOIN profiles p ON m.user_id = p.id
LEFT JOIN coaches c ON m.coach_id = c.id;
```

**Mobile Usage**:
```dart
// Get conversation messages with sender info
final messages = await supabase
  .from('messages_with_coach')
  .select()
  .eq('conversation_id', conversationId)
  .order('created_at', ascending: true);

// Display in chat UI
for (final msg in messages) {
  ChatBubble(
    text: msg['content'],
    senderName: msg['sender_name'],
    senderAvatar: msg['sender_avatar'],
    isFromCoach: msg['role'] == 'assistant',
  );
}
```

**Benefits**:
- Includes sender display info
- No need for separate coach queries
- Ready for chat UI rendering

## Check-in Views

### 6. `user_checkins`
**Purpose**: Completed check-ins with category information.

**Schema**:
```sql
SELECT 
  c.id,
  c.user_id,
  c.category_id,
  c.started_at,
  c.completed_at,
  c.status,
  c.wellness_level,
  c.summary,
  c.insight,
  c.brief,
  c.mood,
  cat.name as category_name,
  pc.checkin_count
FROM checkins c
JOIN categories cat ON cat.id = c.category_id
LEFT JOIN profile_categories pc ON pc.user_id = c.user_id AND pc.category_id = c.category_id
WHERE c.status = 'completed';
```

**Mobile Usage**:
```dart
// Get user's check-in history
final checkins = await supabase
  .from('user_checkins')
  .select()
  .eq('user_id', userId)
  .order('completed_at', ascending: false)
  .limit(10);

// Display wellness trends
final wellnessLevels = checkins.map((c) => c['wellness_level']).toList();
```

**Benefits**:
- Only shows completed check-ins
- Includes category name
- Shows total check-ins per category

### 7. `checkin_history_view`
**Purpose**: Simplified check-in history with category styling information.

**Schema**:
```sql
SELECT 
  ch.*,                          -- All checkin columns
  c.name as category_name,
  c.primary_color as category_color,
  c.icon as category_icon
FROM checkins ch
JOIN categories c ON ch.category_id = c.id
WHERE ch.status = 'completed';
```

**Mobile Usage**:
```dart
// Display check-in history with category colors
final history = await supabase
  .from('checkin_history_view')
  .select()
  .eq('user_id', userId)
  .order('completed_at', ascending: false);

// Render with category styling
for (final checkin in history) {
  CheckinCard(
    categoryName: checkin['category_name'],
    categoryColor: Color(int.parse(checkin['category_color'])),
    categoryIcon: checkin['category_icon'],
    completedAt: checkin['completed_at'],
  );
}
```

**Benefits**:
- Includes visual styling data
- Filtered to completed only
- Ready for UI rendering

### 8. `checkins_with_answers`
**Purpose**: Check-ins with all associated answers aggregated.

**Schema**:
```sql
SELECT c.*,
       cat.name as category_name,
       COUNT(ca.id) as answer_count,
       ARRAY_AGG(
         jsonb_build_object(
           'question_id', ca.question_id,
           'answer', ca.answer,
           'answered_at', ca.answered_at
         ) ORDER BY ca.answered_at
       ) as answers
FROM checkins c
LEFT JOIN categories cat ON c.category_id = cat.id
LEFT JOIN checkin_answers ca ON c.id = ca.checkin_id
GROUP BY c.id, cat.name;
```

**Mobile Usage**:
```dart
// Get check-in with all answers
final checkinData = await supabase
  .from('checkins_with_answers')
  .select()
  .eq('id', checkinId)
  .single();

// Access answers array
List<dynamic> answers = checkinData['answers'] ?? [];
for (final answer in answers) {
  print('Q: ${answer['question_id']}');
  print('A: ${answer['answer']}');
}
```

**Benefits**:
- Single query for check-in + all answers
- Answers pre-sorted by time
- Includes answer count

## Recommendation Views

### 9. `active_recommendations`
**Purpose**: Currently active recommendations with category information.

**Schema**:
```sql
SELECT 
  r.*,                           -- All recommendation columns
  c.name as category_name,
  c.icon as category_icon,
  c.primary_color as category_color
FROM recommendations r
JOIN categories c ON r.category_id = c.id
WHERE r.is_active = true;
```

**Mobile Usage**:
```dart
// Get active recommendations for user
final recommendations = await supabase
  .from('active_recommendations')
  .select()
  .eq('user_id', userId)
  .order('importance', ascending: false);

// Display with category context
for (final rec in recommendations) {
  RecommendationCard(
    title: rec['title'],
    text: rec['recommendation_text'],
    categoryName: rec['category_name'],
    categoryIcon: rec['category_icon'],
    importance: rec['importance'],
  );
}
```

**Benefits**:
- Filters to active only
- Includes category context
- Ready for priority sorting

### 10. `recommendations_active`
**Purpose**: Active recommendations that haven't expired (alternative view).

**Schema**:
```sql
SELECT r.*,
       c.name as category_name,
       c.icon as category_icon,
       c.primary_color as category_color
FROM recommendations r
LEFT JOIN categories c ON r.category_id = c.id
WHERE r.is_active = true;
```

**Mobile Usage**: Similar to `active_recommendations` view.

### 11. `recommendations_with_children`
**Purpose**: Hierarchical recommendations with their child recommendations.

**Schema**:
```sql
SELECT 
  r.*,                           -- All parent recommendation columns
  COALESCE(
    json_agg(
      json_build_object(
        'id', rc.id,
        'title', rc.title,
        'recommendation_text', rc.recommendation_text,
        'action', rc.action,
        'importance', rc.importance,
        'category_id', rc.category_id,
        'created_at', rc.created_at
      ) ORDER BY rc.importance DESC NULLS LAST, rc.created_at
    ) FILTER (WHERE rc.id IS NOT NULL),
    '[]'::json
  ) as children
FROM recommendations r
LEFT JOIN recommendations rc ON rc.parent_recommendation_id = r.id
GROUP BY r.id;
```

**Mobile Usage**:
```dart
// Get hierarchical recommendations
final parentRecs = await supabase
  .from('recommendations_with_children')
  .select()
  .eq('user_id', userId)
  .is_('parent_recommendation_id', null);

// Display with children
for (final parent in parentRecs) {
  ParentRecommendation(
    title: parent['title'],
    children: (parent['children'] as List).map((child) => 
      ChildRecommendation(
        title: child['title'],
        text: child['recommendation_text'],
      )
    ).toList(),
  );
}
```

**Benefits**:
- Pre-aggregated parent-child structure
- Children sorted by importance
- Single query for hierarchy

## Analytics Views

### 12. `user_audio_usage`
**Purpose**: Aggregated audio transcription usage per user.

**Schema**:
```sql
SELECT 
  user_id,
  COUNT(*) as total_transcriptions,
  SUM(duration_seconds) as total_duration_seconds,
  SUM(file_size_bytes) as total_bytes,
  AVG(duration_seconds) as avg_duration_seconds,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 minute') as recent_requests
FROM audio_usage_logs
WHERE success = true
GROUP BY user_id;
```

**Mobile Usage**:
```dart
// Check user's audio usage
final usage = await supabase
  .from('user_audio_usage')
  .select()
  .eq('user_id', userId)
  .single();

// Check rate limits
if (usage['recent_requests'] >= 5) {
  showError('Please wait before recording another message');
}
```

**Benefits**:
- Pre-calculated usage stats
- Includes rate limit check
- Filters successful only

### 13. `admin_audio_usage`
**Purpose**: Daily audio usage statistics for admin monitoring.

**Schema**:
```sql
SELECT 
  DATE_TRUNC('day', created_at) as usage_date,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_requests,
  SUM(duration_seconds) as total_duration_seconds,
  SUM(file_size_bytes) as total_bytes,
  COUNT(*) FILTER (WHERE NOT success) as failed_requests
FROM audio_usage_logs
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY usage_date DESC;
```

**Mobile Usage**: Not typically used by mobile clients - admin only.


## Best Practices for Mobile Integration

### 1. Use Views for Complex Joins
Instead of multiple queries:
```dart
// ❌ Don't do this
final profile = await supabase.from('profiles').select().eq('id', userId).single();
final coach = await supabase.from('coaches').select().eq('id', profile['coach_id']).single();

// ✅ Do this
final profileWithCoach = await supabase
  .from('user_profiles_with_coaches')
  .select()
  .eq('id', userId)
  .single();
```

### 2. Leverage Pre-Aggregated Data
```dart
// ❌ Don't calculate on client
final messages = await supabase.from('messages').select().eq('user_id', userId);
final messageCount = messages.length;

// ✅ Use pre-calculated stats
final stats = await supabase.from('user_stats').select().eq('user_id', userId).single();
final messageCount = stats['total_messages'];
```

### 3. Filter at Database Level
```dart
// ❌ Don't filter on client
final allRecs = await supabase.from('recommendations').select();
final activeRecs = allRecs.where((r) => r['is_active'] == true).toList();

// ✅ Use filtered views
final activeRecs = await supabase.from('active_recommendations').select();
```

### 4. Use Appropriate Views for UI Context
```dart
// For chat display
final messages = await supabase.from('messages_with_coach').select();

// For check-in history with styling
final history = await supabase.from('checkin_history_view').select();

// For hierarchical display
final recommendations = await supabase.from('recommendations_with_children').select();
```

## Security Considerations

All views inherit Row Level Security (RLS) from their base tables when `security_invoker = true` is set. This means:

1. Users can only see their own data
2. No additional RLS policies needed on views
3. Authenticated access required for most views
4. Some views (categories, coaches) allow anonymous read access

## Performance Tips

1. **Indexed Columns**: Views leverage indexes from base tables
2. **Limit Results**: Always use `.limit()` for large datasets
3. **Order Efficiently**: Use indexed columns for ordering
4. **Select Specific Columns**: Use `.select('column1,column2')` when you don't need all data
5. **Cache Results**: Cache view results that don't change frequently

## View Maintenance

Views are automatically updated when base table data changes. No manual refresh needed. Views are recreated during migrations if schema changes affect them.