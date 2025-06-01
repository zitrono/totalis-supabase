# Totalis Backend Capabilities Reference

This document provides a comprehensive reference of all backend capabilities available in the Totalis Supabase backend for Flutter developers. It includes database tables, edge functions, views, RLS policies, storage buckets, and real-time subscriptions.

## Table of Contents
1. [Database Tables](#database-tables)
2. [Edge Functions](#edge-functions)
3. [Database Views](#database-views)
4. [RLS Policies & Permissions](#rls-policies--permissions)
5. [Storage Buckets](#storage-buckets)
6. [Real-time Subscriptions](#real-time-subscriptions)
7. [Database Functions](#database-functions)
8. [Authentication](#authentication)

---

## Database Tables

### 1. profiles
**Purpose**: User profile information (auto-created on auth.users insert)

**Columns**:
```sql
id: UUID (PK, matches auth.uid())
email: TEXT (unique)
display_name: TEXT
photo_url: TEXT
phone: TEXT
birthdate: DATE
sex: TEXT (male|female|non_binary|other|prefer_not_to_say)
coach_id: UUID (FK -> coaches)
last_seen_at: TIMESTAMPTZ
last_login: TIMESTAMPTZ
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
metadata: JSONB
```

**Flutter SDK Usage**:
```dart
// Get current user profile
final profile = await supabase
  .from('profiles')
  .select('*, coaches(*)')
  .eq('id', supabase.auth.currentUser!.id)
  .single();

// Update profile
await supabase
  .from('profiles')
  .update({
    'display_name': 'John Doe',
    'birthdate': '1990-01-15',
    'sex': 'male'
  })
  .eq('id', userId);
```

### 2. coaches
**Purpose**: Wellness coaches available in the system

**Columns**:
```sql
id: UUID (PK)
name: TEXT (required)
bio: TEXT
photo_url: TEXT
sex: TEXT
year_of_birth: INTEGER
specialty: TEXT
is_active: BOOLEAN (default: true)
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
metadata: JSONB
```

**Flutter SDK Usage**:
```dart
// Get all active coaches
final coaches = await supabase
  .from('coaches')
  .select()
  .eq('is_active', true)
  .order('name');

// Get coach by ID
final coach = await supabase
  .from('coaches')
  .select()
  .eq('id', coachId)
  .single();
```

### 3. categories
**Purpose**: Wellness categories with hierarchy support

**Columns**:
```sql
id: UUID (PK)
name: TEXT (required)
name_short: TEXT
description: TEXT
parent_id: UUID (FK -> categories, self-reference)
sort_order: INTEGER (default: 0)
is_active: BOOLEAN (default: true)
checkin_enabled: BOOLEAN (default: true)
primary_color: TEXT
secondary_color: TEXT
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
metadata: JSONB
```

**Flutter SDK Usage**:
```dart
// Get root categories
final rootCategories = await supabase
  .from('categories')
  .select()
  .is_('parent_id', null)
  .eq('is_active', true)
  .order('sort_order');

// Get subcategories
final subCategories = await supabase
  .from('categories')
  .select()
  .eq('parent_id', parentCategoryId)
  .order('sort_order');
```

### 4. profile_categories
**Purpose**: User's selected categories with favorites

**Columns**:
```sql
id: UUID (PK)
user_id: UUID (FK -> profiles)
category_id: UUID (FK -> categories)
is_favorite: BOOLEAN (default: false)
sort_order: INTEGER (default: 0)
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
metadata: JSONB
UNIQUE(user_id, category_id)
```

**Flutter SDK Usage**:
```dart
// Get user's selected categories
final userCategories = await supabase
  .from('profile_categories')
  .select('*, categories(*)')
  .eq('user_id', userId)
  .order('sort_order');

// Toggle favorite
await supabase.rpc('toggle_favorite_category', {
  'p_category_id': categoryId
});
```

### 5. messages
**Purpose**: Chat messages with role-based system

**Columns**:
```sql
id: UUID (PK)
user_id: UUID (FK -> profiles)
coach_id: UUID (FK -> coaches)
conversation_id: UUID
session_id: UUID
content: TEXT (required)
role: TEXT (user|assistant|system)
content_type: TEXT (text|voice|checkin|feedback)
is_read: BOOLEAN (default: false)
is_from_coach: BOOLEAN (generated)
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
metadata: JSONB
```

**Flutter SDK Usage**:
```dart
// Send a message
final message = await supabase
  .from('messages')
  .insert({
    'user_id': userId,
    'content': 'Hello coach!',
    'role': 'user',
    'content_type': 'text',
    'conversation_id': conversationId
  })
  .select()
  .single();

// Get conversation messages
final messages = await supabase
  .from('messages')
  .select('*, coaches(name, photo_url)')
  .eq('conversation_id', conversationId)
  .order('created_at');
```

### 6. check_in_sessions
**Purpose**: User wellness check-in sessions

**Columns**:
```sql
id: UUID (PK)
user_id: UUID (FK -> profiles)
coach_id: UUID (FK -> coaches)
category_id: UUID (FK -> categories)
rating: INTEGER (1-5)
notes: TEXT
session_type: TEXT (default: 'general')
duration_seconds: INTEGER
started_at: TIMESTAMPTZ
completed_at: TIMESTAMPTZ
status: TEXT (active|completed|abandoned)
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
metadata: JSONB
```

**Flutter SDK Usage**:
```dart
// Start check-in session
final session = await supabase
  .from('check_in_sessions')
  .insert({
    'user_id': userId,
    'category_id': categoryId,
    'status': 'active'
  })
  .select()
  .single();

// Complete check-in
await supabase.rpc('complete_check_in', {
  'p_session_id': sessionId
});
```

### 7. recommendations
**Purpose**: AI-generated health recommendations

**Columns**:
```sql
id: UUID (PK)
user_id: UUID (FK -> profiles)
coach_id: UUID (FK -> coaches)
parent_id: UUID (FK -> recommendations, self-reference)
title: TEXT (required)
content: TEXT (required)
category_id: UUID (FK -> categories)
recommendation_type: TEXT (action|category|insight)
priority: INTEGER (default: 0)
is_read: BOOLEAN (default: false)
is_favorite: BOOLEAN (default: false)
is_completed: BOOLEAN (default: false)
completed_at: TIMESTAMPTZ
expires_at: TIMESTAMPTZ
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
metadata: JSONB
```

**Flutter SDK Usage**:
```dart
// Get active recommendations
final recommendations = await supabase
  .from('recommendations')
  .select('*, categories(name, primary_color)')
  .eq('user_id', userId)
  .eq('is_completed', false)
  .order('priority', ascending: false);

// Mark as completed
await supabase
  .from('recommendations')
  .update({
    'is_completed': true,
    'completed_at': DateTime.now().toIso8601String()
  })
  .eq('id', recommendationId);
```

### 8. audio_transcriptions
**Purpose**: Audio message transcriptions

**Columns**:
```sql
id: UUID (PK)
user_id: UUID (FK -> profiles)
filename: TEXT
transcription: TEXT
duration_seconds: NUMERIC
word_count: INTEGER
language: TEXT (default: 'en')
status: TEXT (pending|processing|completed|failed)
error_message: TEXT
model_used: TEXT
created_at: TIMESTAMPTZ
updated_at: TIMESTAMPTZ
metadata: JSONB
```

**Flutter SDK Usage**:
```dart
// Create transcription record
final transcription = await supabase
  .from('audio_transcriptions')
  .insert({
    'user_id': userId,
    'filename': 'audio_${DateTime.now().millisecondsSinceEpoch}.webm',
    'status': 'pending'
  })
  .select()
  .single();

// Check transcription status
final status = await supabase
  .from('audio_transcriptions')
  .select('status, transcription, error_message')
  .eq('id', transcriptionId)
  .single();
```

---

## Edge Functions

### 1. audio-transcription
**Purpose**: Transcribe audio using OpenAI Whisper

**Endpoint**: `POST /functions/v1/audio-transcription`

**Request**:
```dart
final response = await supabase.functions.invoke(
  'audio-transcription',
  body: {
    'audio_url': 'https://...', // OR audio_base64
    'language': 'en',
    'prompt': 'Optional context',
    'message_id': 'uuid' // Optional, to update message
  }
);

// Response
{
  "text": "Transcribed text here",
  "duration": 5.2,
  "language": "en"
}
```

### 2. chat-ai-response
**Purpose**: Get AI coach response in chat

**Endpoint**: `POST /functions/v1/chat-ai-response`

**Request**:
```dart
final response = await supabase.functions.invoke(
  'chat-ai-response',
  body: {
    'message': 'I feel stressed today',
    'contextType': 'category',
    'contextId': categoryId,
    'includeHistory': true
  }
);

// Response
{
  "userMessage": {
    "content": "I feel stressed today",
    "isUser": true
  },
  "aiMessage": {
    "content": "I understand you're feeling stressed...",
    "isUser": false
  },
  "coach": {
    "name": "Daniel",
    "voice": "supportive"
  }
}
```

### 3. recommendations
**Purpose**: Generate personalized recommendations

**Endpoint**: `POST /functions/v1/recommendations`

**Request**:
```dart
final response = await supabase.functions.invoke(
  'recommendations',
  body: {
    'count': 3,
    'categoryId': categoryId // Optional
  }
);

// Response
{
  "recommendations": [{
    "id": "uuid",
    "title": "Practice Deep Breathing",
    "insight": "Based on your stress levels",
    "why": "Helps reduce cortisol",
    "action": "Take 5 minutes now",
    "categoryId": "uuid",
    "importance": 9
  }]
}
```

### 4. checkin
**Purpose**: Handle check-in flow

**Endpoint**: `POST /functions/v1/checkin`

**Request**:
```dart
// Start check-in
final response = await supabase.functions.invoke(
  'checkin',
  body: {
    'action': 'start',
    'categoryId': categoryId
  }
);

// Process answer
final response = await supabase.functions.invoke(
  'checkin',
  body: {
    'action': 'answer',
    'sessionId': sessionId,
    'question': 'How are you feeling?',
    'answer': 'Stressed but managing'
  }
);

// Complete check-in
final response = await supabase.functions.invoke(
  'checkin',
  body: {
    'action': 'complete',
    'sessionId': sessionId
  }
);
```

### 5. text-to-speech
**Purpose**: Convert text to speech audio

**Endpoint**: `POST /functions/v1/text-to-speech`

**Request**:
```dart
final response = await supabase.functions.invoke(
  'text-to-speech',
  body: {
    'text': 'Hello, how are you today?',
    'voice': 'alloy', // alloy, echo, fable, onyx, nova, shimmer
    'speed': 1.0
  }
);

// Response
{
  "audio_url": "https://...supabase.co/storage/v1/object/public/voice-messages/tts/...",
  "duration": 2.5
}
```

### 6. analytics-summary
**Purpose**: Generate user analytics summary

**Endpoint**: `POST /functions/v1/analytics-summary`

**Request**:
```dart
final response = await supabase.functions.invoke(
  'analytics-summary',
  body: {
    'period': 'week' // week, month, all
  }
);

// Response
{
  "summary": {
    "totalCheckIns": 7,
    "completedCheckIns": 5,
    "topCategories": [{
      "categoryId": "uuid",
      "categoryName": "Stress Management",
      "count": 3
    }],
    "streakDays": 7,
    "insights": [
      "Great 7-day streak!",
      "Focus on Stress Management"
    ]
  }
}
```

---

## Database Views

### 1. user_profiles_with_coaches
**Purpose**: User profiles with coach information

**Flutter Usage**:
```dart
final profile = await supabase
  .from('user_profiles_with_coaches')
  .select()
  .eq('id', userId)
  .single();

// Access fields
String userName = profile['display_name'];
String coachName = profile['coach_name'];
String coachPhoto = profile['coach_photo_url'];
```

### 2. categories_with_user_preferences
**Purpose**: Categories with user selection/favorite status

**Flutter Usage**:
```dart
final categories = await supabase
  .from('categories_with_user_preferences')
  .select()
  .eq('is_active', true)
  .order('sort_order');

// Filter by user preferences
final selected = categories.where((c) => c['is_selected'] == true);
final favorites = categories.where((c) => c['is_favorite'] == true);
```

### 3. user_check_ins
**Purpose**: Completed check-ins with category info

**Flutter Usage**:
```dart
final checkIns = await supabase
  .from('user_check_ins')
  .select()
  .order('completed_at', ascending: false)
  .limit(20);

// Display in UI
for (final checkIn in checkIns) {
  print('${checkIn['category_name']}: ${checkIn['rating']}/5');
}
```

### 4. mobile_user_dashboard
**Purpose**: Dashboard summary data

**Flutter Usage**:
```dart
final dashboard = await supabase
  .from('mobile_user_dashboard')
  .select()
  .single();

// Display stats
int unreadMessages = dashboard['unread_messages'];
int unreadRecs = dashboard['unread_recommendations'];
Map stats = dashboard['stats'];
```

### 5. mobile_recommendations_feed
**Purpose**: Recommendation feed with metadata

**Flutter Usage**:
```dart
final feed = await supabase
  .from('mobile_recommendations_feed')
  .select()
  .order('created_at', ascending: false);

// Filter new recommendations
final newRecs = feed.where((r) => r['is_new'] == true);
```

---

## RLS Policies & Permissions

### User Data Access Pattern
All user-specific tables enforce row-level security:

```dart
// ✅ These queries automatically filter by authenticated user
await supabase.from('profiles').select();           // Only your profile
await supabase.from('messages').select();           // Only your messages
await supabase.from('recommendations').select();    // Only your recommendations
await supabase.from('check_in_sessions').select(); // Only your check-ins

// ❌ Cannot access other users' data
await supabase.from('profiles').select().eq('id', 'other-user-id'); // Returns empty
```

### Public Data Access
Some tables allow public read access:

```dart
// ✅ These work for all authenticated users
await supabase.from('coaches').select();     // All coaches
await supabase.from('categories').select();  // All categories
await supabase.from('app_config').select().eq('is_public', true); // Public config
```

### Service Role Operations
Edge functions use service role for elevated permissions:
- Creating AI responses as coach
- Generating recommendations
- Analytics aggregation
- System operations

---

## Storage Buckets

### 1. user-images (Public)
**Purpose**: User profile photos and uploads

**Flutter Usage**:
```dart
// Upload profile photo
final file = File('path/to/photo.jpg');
final response = await supabase.storage
  .from('user-images')
  .upload(
    '${userId}/profile/avatar.jpg',
    file,
    fileOptions: FileOptions(
      contentType: 'image/jpeg',
      upsert: true
    )
  );

// Get public URL
final url = supabase.storage
  .from('user-images')
  .getPublicUrl('${userId}/profile/avatar.jpg');
```

### 2. coach-images (Public)
**Purpose**: Coach photos in multiple sizes

**Flutter Usage**:
```dart
// Get coach image URL
final mainUrl = supabase.storage
  .from('coach-images')
  .getPublicUrl('main/${coachId}.jpg');

final thumbnailUrl = supabase.storage
  .from('coach-images')
  .getPublicUrl('60/${coachId}.jpg');
```

### 3. voice-messages (Private)
**Purpose**: Voice recordings and TTS audio

**Flutter Usage**:
```dart
// Upload voice recording
final audioFile = File('recording.webm');
final timestamp = DateTime.now().millisecondsSinceEpoch;
final path = '${userId}/${timestamp}.webm';

await supabase.storage
  .from('voice-messages')
  .upload(path, audioFile);

// Get signed URL (private bucket)
final signedUrl = await supabase.storage
  .from('voice-messages')
  .createSignedUrl(path, 3600); // 1 hour expiry
```

### 4. category-icons (Public)
**Purpose**: Category icon images

**Flutter Usage**:
```dart
// Get category icon
final iconUrl = supabase.storage
  .from('category-icons')
  .getPublicUrl('main/${categoryId}.svg');
```

---

## Real-time Subscriptions

### 1. Messages Real-time
```dart
// Subscribe to new messages
final subscription = supabase
  .from('messages')
  .stream(primaryKey: ['id'])
  .eq('conversation_id', conversationId)
  .order('created_at')
  .listen((List<Map<String, dynamic>> data) {
    // Handle new/updated messages
    setState(() {
      messages = data;
    });
  });

// Cleanup
await subscription.cancel();
```

### 2. Recommendations Real-time
```dart
// Subscribe to new recommendations
final subscription = supabase
  .from('recommendations')
  .stream(primaryKey: ['id'])
  .eq('user_id', userId)
  .eq('is_read', false)
  .listen((data) {
    // Show notification for new recommendation
    showNotification('New recommendation: ${data.first['title']}');
  });
```

### 3. Check-in Status Updates
```dart
// Monitor active check-in
final subscription = supabase
  .from('check_in_sessions')
  .stream(primaryKey: ['id'])
  .eq('id', sessionId)
  .listen((data) {
    final status = data.first['status'];
    if (status == 'completed') {
      // Navigate to completion screen
    }
  });
```

### 4. Profile Updates
```dart
// Monitor profile changes
final subscription = supabase
  .from('profiles')
  .stream(primaryKey: ['id'])
  .eq('id', userId)
  .listen((data) {
    // Update local profile cache
    updateLocalProfile(data.first);
  });
```

---

## Database Functions

### 1. update_last_seen()
**Purpose**: Update user's last activity timestamp

```dart
await supabase.rpc('update_last_seen');
```

### 2. log_analytics_event()
**Purpose**: Log custom analytics events

```dart
await supabase.rpc('log_analytics_event', params: {
  'p_event_type': 'category_viewed',
  'p_event_data': {
    'category_id': categoryId,
    'view_duration': 30
  },
  'p_platform': 'ios',
  'p_app_version': '1.0.0'
});
```

### 3. toggle_favorite_category()
**Purpose**: Toggle category favorite status

```dart
final isFavorite = await supabase.rpc('toggle_favorite_category', params: {
  'p_category_id': categoryId
});
```

### 4. complete_check_in()
**Purpose**: Complete an active check-in session

```dart
final completedSession = await supabase.rpc('complete_check_in', params: {
  'p_session_id': sessionId
});
```

### 5. get_storage_url()
**Purpose**: Generate storage URLs

```dart
final url = await supabase.rpc('get_storage_url', params: {
  'p_bucket': 'user-images',
  'p_path': 'profile/avatar.jpg'
});
```

---

## Authentication

### Google OAuth
```dart
// Sign in with Google
final response = await supabase.auth.signInWithOAuth(
  OAuthProvider.google,
  redirectTo: 'io.supabase.totalis://login-callback',
  scopes: 'email profile',
);

// Handle deep link
supabase.auth.getSessionFromUrl(Uri.parse(url));
```

### Email/Password
```dart
// Sign up
final response = await supabase.auth.signUp(
  email: email,
  password: password,
  data: {
    'display_name': name,
  }
);

// Sign in
final response = await supabase.auth.signInWithPassword(
  email: email,
  password: password,
);
```

### Session Management
```dart
// Get current session
final session = supabase.auth.currentSession;
final user = supabase.auth.currentUser;

// Listen to auth changes
supabase.auth.onAuthStateChange.listen((data) {
  final event = data.event;
  final session = data.session;
  
  if (event == AuthChangeEvent.signedIn) {
    // Navigate to home
  } else if (event == AuthChangeEvent.signedOut) {
    // Navigate to login
  }
});

// Sign out
await supabase.auth.signOut();
```

### Profile Creation
Profiles are automatically created via database trigger when a user signs up. No manual profile creation needed.

---

## Error Handling

### Database Errors
```dart
try {
  final data = await supabase.from('table').select();
} on PostgrestException catch (error) {
  print('Database error: ${error.message}');
  print('Details: ${error.details}');
  print('Hint: ${error.hint}');
  print('Code: ${error.code}');
}
```

### Storage Errors
```dart
try {
  await supabase.storage.from('bucket').upload(path, file);
} on StorageException catch (error) {
  print('Storage error: ${error.message}');
  if (error.statusCode == '413') {
    print('File too large');
  }
}
```

### Edge Function Errors
```dart
try {
  final response = await supabase.functions.invoke('function-name');
  if (response.data['error'] != null) {
    print('Function error: ${response.data['error']}');
  }
} on FunctionException catch (error) {
  print('Function exception: ${error.message}');
}
```

### Auth Errors
```dart
try {
  await supabase.auth.signInWithPassword(email: email, password: password);
} on AuthException catch (error) {
  print('Auth error: ${error.message}');
  if (error.message.contains('Invalid login')) {
    print('Wrong email or password');
  }
}
```

---

## Performance Best Practices

### 1. Use Views for Complex Queries
```dart
// ❌ Multiple queries
final profile = await supabase.from('profiles').select();
final coach = await supabase.from('coaches').select();

// ✅ Single view query
final data = await supabase.from('user_profiles_with_coaches').select();
```

### 2. Limit and Paginate
```dart
// Get paginated results
final page = 0;
final pageSize = 20;
final results = await supabase
  .from('messages')
  .select()
  .order('created_at', ascending: false)
  .range(page * pageSize, (page + 1) * pageSize - 1);
```

### 3. Select Only Needed Columns
```dart
// ❌ Select all columns
final data = await supabase.from('profiles').select();

// ✅ Select specific columns
final data = await supabase
  .from('profiles')
  .select('id, display_name, photo_url');
```

### 4. Use Indexes
All foreign keys and commonly queried fields have indexes. Use them:
```dart
// These queries use indexes
.eq('user_id', userId)
.eq('category_id', categoryId)
.eq('status', 'active')
.order('created_at')
```

### 5. Cache Static Data
```dart
// Cache categories (they rarely change)
class CategoryService {
  List<Category>? _cachedCategories;
  DateTime? _cacheTime;
  
  Future<List<Category>> getCategories() async {
    if (_cachedCategories != null && 
        _cacheTime != null &&
        DateTime.now().difference(_cacheTime!) < Duration(hours: 1)) {
      return _cachedCategories!;
    }
    
    final data = await supabase.from('categories').select();
    _cachedCategories = data.map((e) => Category.fromJson(e)).toList();
    _cacheTime = DateTime.now();
    return _cachedCategories!;
  }
}
```

---

## Migration from Firebase

Since this is a greenfield project with no legacy data:

1. **Direct Integration**: Use Supabase SDK directly, no abstraction layers
2. **No Data Migration**: Start fresh with new data model
3. **Simplified Auth**: Use Supabase Auth instead of Firebase Auth
4. **Real-time**: Use Supabase real-time instead of Firestore listeners
5. **Storage**: Use Supabase Storage instead of Firebase Storage

### Key Differences:
- **SQL vs NoSQL**: Supabase uses PostgreSQL (relational)
- **Real-time**: Subscribe to table changes, not documents
- **Auth**: Integrated with database via auth.uid()
- **Storage**: Path-based with RLS policies
- **Functions**: Edge Functions instead of Cloud Functions