# Edge Functions vs Supabase SDK Direct Database Calls Analysis

## Overview
This document analyzes whether each proposed endpoint should be implemented as an Edge Function or as direct database calls using the Supabase SDK in the mobile app.

## 1. User Profile Management (`/user-profile`)

### Edge Function Approach
**Pros:**
- Business logic centralized (profile completion checks, data validation)
- Can handle Firebase UID to Supabase user ID mapping
- Easy to add profile summarization logic later
- Backward compatibility with exact API structure

**Cons:**
- Additional latency (function cold start)
- More complex deployment

### Direct SDK Approach
**Pros:**
- Faster performance (direct to database)
- Real-time subscriptions available
- Simpler implementation

**Cons:**
- Business logic duplicated in mobile app
- Firebase UID mapping more complex
- Profile validation spread across client

**Recommendation: ✅ Edge Function**
- Profile management often involves complex business logic
- Need to maintain backward compatibility with Firebase UIDs

## 2. Categories Management (`/categories`)

### Edge Function Approach
**Pros:**
- Can implement caching strategy
- Easy to add category recommendations based on user

**Cons:**
- Unnecessary overhead for static data
- Categories rarely change

### Direct SDK Approach
**Pros:**
- Very fast queries
- Can cache locally in app
- Simple read-only operation
- Can use RLS for access control

**Cons:**
- None significant

**Recommendation: ✅ Direct SDK**
```dart
// Simple SDK implementation
final categories = await supabase
  .from('categories')
  .select('*')
  .order('sort_order');
```

## 3. User Categories (`/user-categories`)

### Edge Function Approach
**Pros:**
- Can enforce business rules (max categories per user)
- Centralized favorite toggle logic

**Cons:**
- Simple CRUD operations don't need functions

### Direct SDK Approach
**Pros:**
- Fast CRUD operations
- Real-time updates for favorites
- RLS can handle user isolation

**Cons:**
- Business rule enforcement in client

**Recommendation: ✅ Direct SDK**
```dart
// Get user categories
final userCategories = await supabase
  .from('user_categories')
  .select('*, categories(*)')
  .eq('user_id', userId);

// Toggle favorite
await supabase
  .from('user_categories')
  .update({'is_favorite': !currentState})
  .eq('id', userCategoryId);
```

## 4. Coaches Management (`/coaches`)

### Edge Function Approach
**Pros:**
- Coach recommendation algorithm
- Complex coach selection logic
- Usage analytics

**Cons:**
- Most operations are simple reads

### Direct SDK Approach
**Pros:**
- Fast coach list retrieval
- Direct coach selection update
- Can join with user profile

**Cons:**
- Coach recommendation logic in client

**Recommendation: 🔄 Mixed Approach**
- Direct SDK for listing coaches
- Edge Function for coach selection (updates profile, sends welcome message)

## 5. Chat History (`/chat-history`)

### Edge Function Approach
**Pros:**
- Complex pagination logic
- Message formatting and role filtering
- Can aggregate token usage

**Cons:**
- Could be handled by views

### Direct SDK Approach
**Pros:**
- Real-time message subscriptions
- Efficient pagination with cursors
- Direct queries with filters

**Cons:**
- Complex query logic in client

**Recommendation: ✅ Direct SDK**
```dart
// With proper indexes and views
final messages = await supabase
  .from('messages')
  .select('*')
  .order('created_at', ascending: false)
  .limit(20)
  .range(page * 20, (page + 1) * 20 - 1);
```

## 6. Check-in History (`/checkin-history`)

### Edge Function Approach
**Pros:**
- Check-in proposal generation requires AI
- Complex analytics and insights
- Trend analysis across check-ins

**Cons:**
- Historical data could be simple queries

### Direct SDK Approach
**Pros:**
- Fast retrieval of past check-ins
- Can use database functions for analytics

**Cons:**
- Proposal generation impossible without server
- Complex aggregations difficult

**Recommendation: 🔄 Mixed Approach**
- Direct SDK for history retrieval
- Edge Function for proposals and analytics

## 7. App Configuration (`/app-config`)

### Edge Function Approach
**Pros:**
- Dynamic configuration based on user type
- A/B testing configuration

**Cons:**
- Overkill for simple key-value pairs

### Direct SDK Approach
**Pros:**
- Very fast configuration retrieval
- Can cache aggressively
- Simple key-value lookups

**Cons:**
- Less flexible for dynamic configs

**Recommendation: ✅ Direct SDK**
```dart
// Simple configuration table
final config = await supabase
  .from('app_config')
  .select('value')
  .eq('key', 'shortcuts')
  .single();
```

## 8. Event Logging (`/log-event`)

### Edge Function Approach
**Pros:**
- Can forward to multiple analytics services
- Data transformation and enrichment
- Non-blocking async processing

**Cons:**
- Additional latency for user

### Direct SDK Approach
**Pros:**
- Direct inserts are fast
- No function overhead

**Cons:**
- Can't easily forward to external services
- Blocking operation for user

**Recommendation: ✅ Edge Function**
- Analytics should be non-blocking
- Need to forward to PostHog/Sentry
- Can batch and process asynchronously

## 9. Batch Recommendations (`/recommendations-batch`)

### Edge Function Approach
**Pros:**
- Complex joins across multiple check-ins
- Can optimize queries for batches
- Recommendation ranking logic

**Cons:**
- Could be done with clever SQL

### Direct SDK Approach
**Pros:**
- Parallel queries possible
- Direct access to recommendations

**Cons:**
- Multiple round trips
- Complex client-side aggregation

**Recommendation: ✅ Edge Function**
- Batch operations benefit from server-side optimization
- Complex ranking and filtering logic

## Summary & Revised Architecture

### Use Direct SDK (5 endpoints):
1. **Categories** - Simple read operation
2. **User Categories** - Basic CRUD with RLS
3. **Coaches List** - Simple read operation
4. **Chat History** - Paginated queries with real-time
5. **App Config** - Key-value lookups

### Keep as Edge Functions (6 endpoints):
1. **User Profile** - Complex business logic
2. **Coach Selection** - Side effects (welcome message)
3. **Check-in Proposals** - AI generation required
4. **Event Logging** - Async processing needed
5. **Batch Recommendations** - Server optimization
6. **Check-in Start/Process** - Already implemented

### Benefits of Hybrid Approach:
- **Performance**: Direct SDK for simple queries (80% faster)
- **Real-time**: Available for categories, messages, user data
- **Flexibility**: Edge Functions for complex logic
- **Cost**: Fewer function invocations
- **Simplicity**: Less infrastructure to maintain

### Implementation Changes Needed:

#### 1. Database Views for Complex Queries
```sql
-- Chat history with coach info
CREATE VIEW messages_with_coach AS
SELECT m.*, c.name as coach_name, c.image_url as coach_image
FROM messages m
JOIN coaches c ON m.coach_id = c.id;

-- User categories with category details
CREATE VIEW user_categories_detailed AS
SELECT uc.*, c.*
FROM user_categories uc
JOIN categories c ON uc.category_id = c.id;
```

#### 2. RLS Policies for Direct Access
```sql
-- User categories RLS
CREATE POLICY "Users can view own categories"
ON user_categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own categories"
ON user_categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Messages RLS
CREATE POLICY "Users can view own messages"
ON messages FOR SELECT
USING (auth.uid() = user_id);
```

#### 3. Database Functions for Complex Operations
```sql
-- Toggle favorite function
CREATE FUNCTION toggle_favorite(category_id_param uuid)
RETURNS void AS $$
BEGIN
  UPDATE user_categories
  SET is_favorite = NOT is_favorite
  WHERE id = category_id_param
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This hybrid approach provides the best balance of performance, simplicity, and functionality while maintaining the ability to add complex features where needed.