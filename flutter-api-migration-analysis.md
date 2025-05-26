# Flutter Mobile Client API Migration Analysis

## Executive Summary

This analysis compares the current Flutter mobile client's API usage with the Supabase migration approach and evaluates test client coverage. The Flutter app uses Firebase Auth + FastAPI backend, which will be fully replaced with Supabase SDK and Edge Functions.

## Current Flutter API Endpoints

Based on the frontend architecture analysis, the Flutter app currently uses these FastAPI endpoints:

| Feature | Current Endpoint | HTTP Method | Purpose |
|---------|-----------------|-------------|---------|
| User Profile | `/api/user/account/` | GET/POST | User data management |
| Categories | `/api/user/category/` | GET | Fetch category hierarchy |
| Messages | `/api/user/message/` | GET/POST | Chat functionality |
| Check-ins | `/api/user/checkin/` | GET/POST | Wellness check-ins |
| Coaches | `/api/user/coach/` | GET | AI coach information |
| Proposals | `/api/user/proposal/` | GET | AI-generated suggestions |

## Supabase Migration Mapping

### 1. Authentication
**Current**: Firebase Auth with ID tokens
**Supabase**: 
- Direct Supabase Auth SDK
- Anonymous sign-in support
- Google OAuth integration
- No Firebase dependency

**Test Coverage**: ✅ COMPLETE
- Anonymous sign-in tested
- User profile creation tested
- Coach assignment tested

### 2. User Profile Management
**Current**: `/api/user/account/`
**Supabase Approach**:
```dart
// Direct database access
supabase
  .from('user_profiles')
  .select()
  .eq('id', userId)
  .single();

// Update profile
supabase
  .from('user_profiles')
  .update(profileData)
  .eq('id', userId);
```

**Test Coverage**: ✅ COMPLETE
- Profile creation/update
- Coach selection
- Default coach assignment

### 3. Categories
**Current**: `/api/user/category/`
**Supabase Approach**:
```dart
// Direct database access with hierarchy
supabase
  .from('categories')
  .select('*, parent:categories!parent_id(*)')
  .order('sort_order');
```

**Test Coverage**: ✅ COMPLETE
- Category listing
- Hierarchy navigation
- Favorite marking
- Progress tracking

### 4. Messaging & Chat
**Current**: `/api/user/message/`
**Supabase Approach**:
```dart
// Direct message storage
supabase
  .from('messages')
  .insert(messageData);

// AI responses via Edge Function
supabase.functions
  .invoke('chat-ai-response', body: {
    'message': userMessage,
    'contextType': 'category',
    'contextId': categoryId
  });
```

**Test Coverage**: ⚠️ PARTIAL
- ✅ Message creation/retrieval
- ✅ Chat history
- ✅ Initial greeting messages
- ❌ Edge function AI responses (simulated locally)
- ❌ Real-time message updates

### 5. Check-ins
**Current**: `/api/user/checkin/`
**Supabase Approach**:
```dart
// Start check-in via Edge Function
supabase.functions
  .invoke('checkin-start', body: {
    'categoryId': categoryId
  });

// Process responses
supabase.functions
  .invoke('checkin-process', body: {
    'checkInId': checkInId,
    'question': question,
    'answer': answer
  });
```

**Test Coverage**: ⚠️ PARTIAL
- ✅ Check-in start/complete flow
- ✅ Question generation (simulated)
- ✅ Answer submission
- ✅ Check-in abortion
- ❌ Edge function integration
- ❌ AI-generated questions

### 6. Coaches
**Current**: `/api/user/coach/`
**Supabase Approach**:
```dart
// Direct database access
supabase
  .from('coaches')
  .select()
  .eq('is_active', true);
```

**Test Coverage**: ✅ COMPLETE
- Coach listing
- Coach selection
- Coach context in messages

### 7. Proposals/Recommendations
**Current**: `/api/user/proposal/`
**Supabase Approach**:
```dart
// Via Edge Function
supabase.functions
  .invoke('recommendations', body: {
    'count': 3,
    'categoryId': categoryId
  });
```

**Test Coverage**: ❌ NOT IMPLEMENTED
- Health cards/recommendations generation disabled
- Edge function not deployed

## Missing Test Coverage

### 1. Edge Functions (Critical Gap)
None of the edge functions are deployed or tested:
- `chat-ai-response` - AI chat responses
- `checkin-start` - Dynamic question generation
- `checkin-process` - Check-in flow management
- `recommendations` - AI recommendations
- `analytics-summary` - User analytics

### 2. Real-time Features
- Supabase Realtime subscriptions for messages
- Live updates for check-in status
- Real-time coach responses

### 3. Storage Operations
- Image uploads for user profiles
- Voice recording storage
- Coach/category image retrieval

### 4. Additional Features Not Covered
- User analytics/summaries
- Follow-up chat scheduling
- Multi-language support
- Offline data sync

## Recommendations

### 1. Immediate Priorities
1. **Deploy Edge Functions**: Critical for AI features
2. **Add Storage Tests**: Image upload/retrieval
3. **Implement Real-time**: Message subscriptions

### 2. Test Client Enhancements
```typescript
// Add edge function testing
async testEdgeFunction(functionName: string, payload: any) {
  return supabase.functions.invoke(functionName, { body: payload });
}

// Add real-time testing
async subscribeToMessages(userId: string) {
  return supabase
    .channel('messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      console.log('New message:', payload);
    })
    .subscribe();
}

// Add storage testing
async uploadUserImage(file: File) {
  return supabase.storage
    .from('user-images')
    .upload(`${userId}/profile.jpg`, file);
}
```

### 3. Flutter Migration Strategy

#### Phase 1: Direct Database Access (Week 1)
- Replace all simple GET endpoints with Supabase queries
- Implement authentication migration
- Test with existing data

#### Phase 2: Edge Functions (Week 2)
- Deploy all edge functions
- Replace complex API calls
- Test AI integrations

#### Phase 3: Real-time & Storage (Week 3)
- Implement real-time subscriptions
- Add storage operations
- Complete offline sync

### 4. Critical Implementation Notes

1. **Authentication Token**: 
   ```dart
   // Current
   headers: {'Authorization': firebaseToken}
   
   // Supabase
   // Automatically handled by SDK after auth
   ```

2. **Error Handling**:
   ```dart
   // Add consistent error handling
   try {
     final response = await supabase.from('table').select();
   } on PostgrestException catch (error) {
     // Handle database errors
   } on FunctionException catch (error) {
     // Handle edge function errors
   }
   ```

3. **Offline Support**:
   ```dart
   // Implement queue for offline operations
   class OfflineQueue {
     Future<void> addOperation(Operation op);
     Future<void> syncWhenOnline();
   }
   ```

## Conclusion

The test client provides good coverage for basic CRUD operations and flows, but lacks coverage for:
1. Edge functions (critical for AI features)
2. Real-time subscriptions
3. Storage operations
4. Analytics and complex queries

The migration is feasible but requires:
1. Edge function deployment and testing
2. Enhanced test client for missing features
3. Careful handling of AI integration points
4. Proper offline queue implementation

Estimated effort: 3-4 weeks for complete migration with proper testing.