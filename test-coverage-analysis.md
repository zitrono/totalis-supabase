# Totalis Supabase Test Coverage Analysis

## Current Test Coverage Overview

### 1. Edge Functions Tests (Good Coverage)
Located in: `src/tests/integration/edge-functions-remote.test.ts`

**Covered:**
- ✅ Langflow Webhook
- ✅ Recommendations (auth required)
- ✅ Check-in Start
- ✅ Check-in Process
- ✅ Check-in Complete
- ✅ Analytics Summary
- ✅ Test data metadata tracking
- ✅ Test cleanup operations

**Test Features:**
- Remote Supabase testing
- Pre-created test users (avoids rate limits)
- Test data isolation via metadata
- Cleanup strategies

### 2. Test Client Services (SDK Operations)
Located in: `src/test-client/services/`

**Services Implemented:**
1. **AuthService** ✅
   - Anonymous sign-in
   - Google sign-in simulation
   - Sign out
   - Current user retrieval
   - Session management

2. **CategoryService** ✅
   - Get all categories
   - Get category details
   - Get subcategories
   - User categories (favorites, shortcuts)
   - Coach listing and details
   - Direct SDK queries with RLS

3. **UserService** ✅
   - Profile creation/update
   - Coach selection
   - Profile existence check
   - Initial greeting creation
   - Direct SDK operations

4. **ChatService** ✅
   - Send messages
   - Get message history
   - System/PreAssistant messages
   - AI response simulation
   - Direct SDK with real-time potential

5. **CheckinService** ✅
   - Start check-in (general/category)
   - Answer questions
   - Complete check-in
   - Abort check-in
   - Insights generation

6. **CardService** ✅
   - Get recommendations
   - Mark as completed/dismissed
   - Batch operations

7. **AudioService** ✅
   - Audio upload
   - Transcription via edge function
   - Usage tracking

### 3. Unit Tests
Located in: `src/test-client/__tests__/`

**Covered:**
- ✅ Authentication flows (mocked)
- ✅ Check-in operations (mocked)
- ❌ No tests for other services

## SDK Operations Required by Mobile Client

Based on the migration plan and phase 6 proposal, the mobile client will need:

### 1. Direct SDK Operations (No Edge Functions)
1. **Categories** ✅ Tested
   - `supabase.from('categories').select()`
   - Hierarchical queries
   - Sorting and filtering

2. **User Categories** ✅ Tested
   - `supabase.from('profile_categories').select/insert/update`
   - Favorites management
   - Shortcuts management
   - RLS-protected CRUD

3. **Coaches List** ✅ Tested
   - `supabase.from('coaches').select()`
   - Active coach filtering
   - Details retrieval

4. **Chat History** ✅ Tested
   - `supabase.from('messages').select()`
   - Pagination support
   - Real-time subscription ready
   - Conversation ordering

5. **App Config** ❌ Not Tested
   - `supabase.from('app_config').select()`
   - Key-value lookups
   - Public/private config separation

### 2. Edge Function Operations
All currently implemented edge functions are tested ✅

### 3. Real-time Operations ❌ Not Tested
- Message subscriptions
- Check-in status updates
- Profile changes
- Category updates

### 4. Storage Operations ❌ Not Tested
- Image upload/download
- Voice recording upload
- Public URL generation
- Bucket policies

### 5. Advanced SDK Features ❌ Not Tested
- Offline support
- Optimistic updates
- Conflict resolution
- Connection state management

## Test Coverage Gaps

### Critical Gaps (High Priority)
1. **App Configuration Access** ❌
   - No tests for `app_config` table queries
   - Mobile app needs shortcuts, prompts, variables
   - Should test key-value retrieval patterns

2. **Storage Operations** ❌
   - No tests for direct storage SDK usage
   - Mobile needs image upload/download
   - Coach images, category icons access

3. **Real-time Subscriptions** ❌
   - No tests for real-time features
   - Mobile could benefit from live updates
   - Message streams, check-in updates

### Medium Priority Gaps
1. **Database Views** ❌
   - No tests for complex view queries
   - `messages_with_coach` view
   - `user_categories_detailed` view

2. **RLS Policy Testing** ❌
   - Limited RLS policy validation
   - Need comprehensive access control tests
   - Cross-user data isolation

3. **Batch Operations** ⚠️ Partially Tested
   - Only recommendation batches tested
   - Need tests for bulk updates
   - Transaction support

### Low Priority Gaps
1. **Performance Testing** ❌
   - No load testing
   - No query optimization tests
   - No connection pooling tests

2. **Error Scenarios** ⚠️ Partially Tested
   - Limited network error simulation
   - No rate limit testing
   - Minimal conflict resolution

## Recommendations

### 1. Immediate Actions (Before Mobile Migration)
```typescript
// Add tests for app configuration
describe('App Configuration SDK Tests', () => {
  test('Get public configuration values', async () => {
    const { data } = await supabase
      .from('app_config')
      .select('key, value')
      .eq('is_public', true);
    
    expect(data).toContainEqual(
      expect.objectContaining({ key: 'shortcuts' })
    );
  });

  test('Get specific config by key', async () => {
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'default_coach')
      .single();
    
    expect(data.value).toBeDefined();
  });
});
```

### 2. Add Storage Tests
```typescript
describe('Storage SDK Tests', () => {
  test('Upload and retrieve image', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    const { data: upload } = await supabase.storage
      .from('coach-images')
      .upload('test/test.jpg', file);
    
    const publicUrl = supabase.storage
      .from('coach-images')
      .getPublicUrl('test/test.jpg');
    
    expect(publicUrl.data.publicUrl).toContain('coach-images');
  });
});
```

### 3. Add Real-time Tests
```typescript
describe('Real-time Subscription Tests', () => {
  test('Subscribe to new messages', (done) => {
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          expect(payload.new).toBeDefined();
          subscription.unsubscribe();
          done();
        }
      )
      .subscribe();
    
    // Trigger a message insert
    sendTestMessage();
  });
});
```

### 4. Test Organization Improvements
1. Create `src/tests/sdk/` directory for SDK-specific tests
2. Add `src/tests/storage/` for storage operations
3. Add `src/tests/realtime/` for subscription tests
4. Create test utilities for common SDK patterns

## Summary

**Current Coverage:** ~70% of required SDK operations
**Critical Gaps:** App config, storage, real-time
**Recommendation:** Add critical SDK tests before mobile migration begins

The test coverage for edge functions is comprehensive, but direct SDK operations that the mobile client will use need more testing. Priority should be given to app configuration access and storage operations as these are fundamental to the mobile app's functionality.