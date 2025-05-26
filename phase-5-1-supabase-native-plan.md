# Phase 5.1: Supabase-Native Backend Architecture

## Overview
Complete redesign using Supabase SDK directly in the Flutter app, minimizing Edge Functions and maximizing clean, maintainable code.

## 1. Database Schema Optimization

### 1.1 Schema Improvements
```sql
-- Rename tables to follow Supabase conventions
ALTER TABLE "user_profiles" RENAME TO "profiles";
ALTER TABLE "user_categories" RENAME TO "profile_categories";
ALTER TABLE "health_cards" RENAME TO "recommendations";

-- Use built-in timestamps
ALTER TABLE profiles 
  DROP COLUMN time_create,
  ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add update trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Flatten relationships for better performance
ALTER TABLE profiles ADD COLUMN coach JSONB;
UPDATE profiles p SET coach = 
  (SELECT row_to_json(c) FROM coaches c WHERE c.id = p.coach_id);

-- Add indexes for common queries
CREATE INDEX idx_messages_conversation ON messages(user_id, created_at DESC);
CREATE INDEX idx_checkins_user_category ON checkins(user_id, category_id, created_at DESC);
```

### 1.2 Image Storage Migration
```sql
-- Replace all image_id references with URLs
ALTER TABLE coaches 
  DROP COLUMN image_id,
  ADD COLUMN image_url TEXT,
  ADD COLUMN avatar_sizes JSONB DEFAULT '{}'; -- {"small": "url", "medium": "url", "large": "url"}

ALTER TABLE categories
  DROP COLUMN icon_id,
  ADD COLUMN icon_url TEXT,
  ADD COLUMN icon_secondary_url TEXT;
```

## 2. Supabase-Native Flutter Architecture

### 2.1 Direct SDK Usage for Most Operations
```dart
// lib/services/supabase_service.dart
class SupabaseService {
  final _supabase = Supabase.instance.client;
  
  // Direct profile access with real-time updates
  Stream<Profile?> watchProfile() {
    return _supabase
      .from('profiles')
      .stream(primaryKey: ['id'])
      .eq('id', _supabase.auth.currentUser!.id)
      .map((data) => data.isEmpty ? null : Profile.fromJson(data.first));
  }
  
  // Categories with real-time updates
  Stream<List<Category>> watchCategories() {
    return _supabase
      .from('categories')
      .stream(primaryKey: ['id'])
      .order('sort_order')
      .map((data) => data.map((json) => Category.fromJson(json)).toList());
  }
  
  // User's selected categories with real-time
  Stream<List<ProfileCategory>> watchUserCategories() {
    return _supabase
      .from('profile_categories')
      .stream(primaryKey: ['id'])
      .eq('user_id', _supabase.auth.currentUser!.id)
      .map((data) => data.map((json) => ProfileCategory.fromJson(json)).toList());
  }
  
  // Direct message insertion with optimistic updates
  Future<Message> sendMessage(String text) async {
    final message = Message(
      id: const Uuid().v4(),
      userId: _supabase.auth.currentUser!.id,
      text: text,
      role: 'user',
      createdAt: DateTime.now(),
    );
    
    // Optimistic update
    _messagesController.add(message);
    
    // Insert and get AI response via Edge Function
    await _supabase.from('messages').insert(message.toJson());
    
    // Edge Function will handle AI response
    await _supabase.functions.invoke('chat-ai-response', body: {
      'message': text,
      'conversation_id': _currentConversationId,
    });
    
    return message;
  }
}
```

### 2.2 State Management with Real-time
```dart
// lib/providers/profile_provider.dart
class ProfileProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;
  StreamSubscription? _profileSubscription;
  Profile? _profile;
  
  Profile? get profile => _profile;
  
  void initialize() {
    _profileSubscription = _supabase
      .from('profiles')
      .stream(primaryKey: ['id'])
      .eq('id', _supabase.auth.currentUser!.id)
      .listen((data) {
        _profile = data.isEmpty ? null : Profile.fromJson(data.first);
        notifyListeners();
      });
  }
  
  // Direct update
  Future<void> updateProfile(Map<String, dynamic> updates) async {
    await _supabase
      .from('profiles')
      .update(updates)
      .eq('id', _supabase.auth.currentUser!.id);
    // Real-time subscription will auto-update the UI
  }
}
```

### 2.3 Offline Support
```dart
// lib/services/offline_sync_service.dart
class OfflineSyncService {
  final _pendingOperations = <PendingOperation>[];
  
  Future<void> executeOfflineFirst(Function operation) async {
    try {
      await operation();
    } catch (e) {
      if (e is PostgrestException && e.code == 'PGRST301') {
        // Network error - queue for later
        _pendingOperations.add(PendingOperation(
          operation: operation,
          timestamp: DateTime.now(),
        ));
        await _savePendingOperations();
      }
    }
  }
  
  // Sync when back online
  Future<void> syncPendingOperations() async {
    for (final op in _pendingOperations) {
      try {
        await op.operation();
        _pendingOperations.remove(op);
      } catch (e) {
        // Keep in queue for next sync
      }
    }
  }
}
```

## 3. Simplified Edge Functions (Only 4 Needed)

### 3.1 AI Chat Response (`/chat-ai-response`)
Already implemented - handles AI responses and conversation management

### 3.2 Check-in Start (`/checkin-start`)
Already implemented - initiates check-in with AI-generated first question

### 3.3 Check-in Process (`/checkin-process`)
Already implemented - handles check-in flow and wellness calculations

### 3.4 Analytics Summary (`/analytics-summary`)
Already implemented - provides aggregated analytics

## 4. New Database Functions & Triggers

### 4.1 Welcome Message Trigger
```sql
-- Trigger for coach selection welcome message
CREATE OR REPLACE FUNCTION send_coach_welcome_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Only if coach changed
  IF NEW.coach_id IS DISTINCT FROM OLD.coach_id THEN
    INSERT INTO messages (user_id, coach_id, text, role, conversation_id)
    SELECT 
      NEW.id,
      NEW.coach_id,
      c.intro,
      'assistant',
      gen_random_uuid()
    FROM coaches c WHERE c.id = NEW.coach_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER coach_welcome_message
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION send_coach_welcome_message();
```

### 4.2 Analytics Event Function
```sql
-- Direct analytics insertion
CREATE OR REPLACE FUNCTION log_event(
  event_name TEXT,
  properties JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO analytics_events (user_id, event_name, properties)
  VALUES (auth.uid(), event_name, properties);
  
  -- Could also trigger webhook to PostHog here
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 5. Authentication Simplification

### 5.1 Clean Auth Service
```dart
// lib/services/auth_service.dart
class AuthService {
  final _supabase = Supabase.instance.client;
  
  // Anonymous sign in
  Future<AuthResponse> signInAnonymously() async {
    return await _supabase.auth.signInAnonymously();
  }
  
  // Google sign in
  Future<AuthResponse> signInWithGoogle() async {
    return await _supabase.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: 'io.supabase.totalis://login-callback',
    );
  }
  
  // Upgrade anonymous to Google
  Future<void> linkGoogleAccount() async {
    await _supabase.auth.updateUser(
      UserAttributes(email: googleEmail),
    );
  }
  
  // No token management needed - Supabase handles it all
  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;
}
```

## 6. Implementation Timeline

### Week 1: Backend Preparation
**Day 1-2: Database Schema Optimization**
- Run schema migration scripts
- Update RLS policies for new structure
- Test all relationships

**Day 3-4: Database Functions & Triggers**
- Implement welcome message trigger
- Create analytics functions
- Add utility functions for common operations

**Day 5: Storage Setup**
- Configure public bucket for images
- Migrate image references to URLs
- Set up CDN caching

### Week 2: Mobile App Rewrite
**Day 1-2: Core Services**
- Implement SupabaseService with all direct SDK calls
- Set up offline sync service
- Create clean auth service

**Day 3-4: State Management**
- Convert all providers to use real-time subscriptions
- Implement optimistic updates
- Add error handling

**Day 5: Testing & Polish**
- End-to-end testing
- Performance optimization
- Error scenarios

## 7. Benefits of This Approach

1. **Minimal Edge Functions**: Only 4 (all AI-related)
2. **Real-time Everything**: Live updates for all data
3. **Offline Support**: Works without connection
4. **Clean Code**: Direct SDK usage, no API abstraction
5. **Fast Performance**: Direct database queries
6. **Lower Costs**: Fewer function invocations
7. **Better DX**: Type-safe queries, auto-completion

## 8. Migration Path

### Step 1: Backend Changes (No App Impact)
- Optimize schema
- Add triggers and functions
- Set up storage

### Step 2: New App Data Layer
- Create new services alongside old ones
- Test thoroughly
- Switch over screen by screen

### Step 3: Cleanup
- Remove old API layer
- Delete unused Edge Functions
- Optimize queries based on usage

## Summary

This Supabase-native approach eliminates 90% of Edge Functions, uses direct SDK calls for everything except AI operations, and provides a much cleaner, more maintainable codebase. The real-time subscriptions and offline support will significantly improve user experience while reducing complexity and costs.

**Next Steps**: Upon approval, I'll begin with the database schema optimizations and backend preparations that won't affect anything currently running.