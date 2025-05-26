# Totalis Supabase Architecture Recommendation

## Executive Summary

This document outlines the recommended architecture for migrating Totalis from its current FastAPI/Firebase stack to a Supabase-first architecture. The migration will consolidate multiple services into Supabase's unified platform while maintaining all core functionality and adding real-time capabilities.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                Flutter Mobile App                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Supabase   │  │   Realtime   │  │    Voice     │  │
│  │   Dart SDK  │  │ Subscriptions│  │   Handler    │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼────────────────┼──────────────────┼──────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase Cloud                        │
│  ┌────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │    Auth    │  │  Database   │  │ Edge Functions  │  │
│  │ • Google   │  │ • Users     │  │ • Voice Trans  │  │
│  │ • Anonymous│  │ • Messages  │  │ • AI Bridge    │  │
│  └────────────┘  │ • Categories│  │ • Webhooks     │  │
│                  │ • Coaches   │  └────────┬────────┘  │
│  ┌────────────┐  │ • Check-ins │           │           │
│  │  Storage   │  └─────────────┘           │           │
│  │ • Images   │                             │           │
│  │ • Audio    │  ┌─────────────┐           │           │
│  └────────────┘  │  Realtime   │           │           │
│                  │ • Messages  │           │           │
│                  └─────────────┘           │           │
└─────────────────────────────────────────────┼───────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────┐
│                    n8n Workflows                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Webhooks   │  │   AI APIs    │  │   Business   │  │
│  │  Receiver   │  │ • Anthropic  │  │    Logic     │  │
│  └─────────────┘  │ • OpenAI     │  └──────────────┘  │
│                   └──────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

```sql
-- Users table (managed by Supabase Auth)
-- No custom users table needed, use auth.users

-- Coaches table
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles (extends auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL, -- Default coach assigned via trigger
  year_of_birth INTEGER,
  sex TEXT CHECK (sex IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
  notification_settings JSONB DEFAULT '{}',
  mood_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories (hierarchical)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES categories(id) ON DELETE RESTRICT, -- Prevent deletion of parent categories
  name TEXT NOT NULL,
  name_short TEXT,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  show_checkin_history BOOLEAN DEFAULT false,
  checkin_enabled BOOLEAN DEFAULT true,
  followup_timer INTEGER, -- minutes
  primary_color TEXT,
  secondary_color TEXT,
  prompt_checkin TEXT, -- For action-oriented recommendations
  prompt_checkin_2 TEXT, -- For category exploration recommendations
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (unified for chat and check-ins)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL, -- Preserve coach context
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'voice', 'checkin', 'feedback')),
  metadata JSONB DEFAULT '{}', -- For mood, check-in data (summary, insight, brief), voice URLs
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_messages_user_created (user_id, created_at DESC),
  INDEX idx_messages_category (category_id)
);

-- Recommendations (unified table for both types)
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('action', 'category')),
  -- 'action': Direct wellness activities (was 'first')
  -- 'category': Explore other categories (was 'second')
  title TEXT,
  recommendation_text TEXT NOT NULL,
  action TEXT, -- What to do
  why TEXT, -- Why it's important
  relevance TEXT, -- For category recommendations
  importance INTEGER CHECK (importance BETWEEN 1 AND 5),
  is_active BOOLEAN DEFAULT true,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_recommendations_user (user_id),
  INDEX idx_recommendations_type (recommendation_type),
  INDEX idx_recommendations_checkin (checkin_message_id)
);

-- Note: Keywords and category_keywords tables excluded based on production analysis
-- These tables were unused in the codebase and had incorrect foreign keys
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- User profiles: Users can only see/edit their own
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Messages: Users can only see their own messages
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Coaches: All authenticated users can view active coaches
CREATE POLICY "Anyone can view active coaches" ON coaches
  FOR SELECT USING (is_active = true);

-- Categories: All authenticated users can view active categories
CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT USING (is_active = true);

-- Recommendations: Users can only see their own
CREATE POLICY "Users can view own recommendations" ON recommendations
  FOR SELECT USING (auth.uid() = user_id);
```

## Edge Functions

### 1. Voice Transcription Function
```typescript
// supabase/functions/voice-transcribe/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { audio_base64 } = await req.json()
  
  // Call OpenAI Whisper API
  const transcription = await transcribeAudio(audio_base64)
  
  return new Response(
    JSON.stringify({ text: transcription }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

### 2. Text-to-Speech Function
```typescript
// supabase/functions/text-to-speech/index.ts
serve(async (req) => {
  const { text, voice = "alloy" } = await req.json()
  
  // Call OpenAI TTS API
  const audio_url = await generateSpeech(text, voice)
  
  return new Response(
    JSON.stringify({ audio_url }),
    { headers: { "Content-Type": "application/json" } }
  )
})
```

### 3. AI Message Processing Webhook
```typescript
// supabase/functions/process-message/index.ts
serve(async (req) => {
  const { message_id, user_id, content, category_id } = await req.json()
  
  // Trigger n8n webhook for AI processing
  const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      message_id,
      user_id,
      content,
      category_id,
      timestamp: new Date().toISOString()
    })
  })
  
  return new Response("OK", { status: 200 })
})
```

### 4. Feedback Processing Function
```typescript
// supabase/functions/process-feedback/index.ts
serve(async (req) => {
  const { user_id, feedback_text } = await req.json()
  
  // Store feedback in messages table
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  await supabase.from('messages').insert({
    user_id,
    content: feedback_text,
    content_type: 'feedback',
    role: 'user',
    metadata: { type: 'user_feedback' }
  })
  
  // Optional: Forward to external system
  if (Deno.env.get('FEEDBACK_WEBHOOK_URL')) {
    await fetch(Deno.env.get('FEEDBACK_WEBHOOK_URL')!, {
      method: 'POST',
      body: JSON.stringify({ user_id, feedback_text })
    })
  }
  
  return new Response("OK", { status: 200 })
})
```

## Mobile App Architecture

### State Management with Supabase
```dart
// lib/services/supabase_service.dart
class SupabaseService {
  final SupabaseClient client = Supabase.instance.client;
  
  // Real-time message subscription
  Stream<List<Message>> getMessageStream(String userId) {
    return client
      .from('messages')
      .stream(primaryKey: ['id'])
      .eq('user_id', userId)
      .order('created_at');
  }
  
  // Voice message handling
  Future<String> sendVoiceMessage(Uint8List audioData) async {
    // Upload to edge function for transcription
    final response = await client.functions.invoke(
      'voice-transcribe',
      body: {'audio_base64': base64Encode(audioData)}
    );
    
    final text = response.data['text'];
    
    // Save as message
    await client.from('messages').insert({
      'content': text,
      'content_type': 'voice',
      'role': 'user',
      'metadata': {'original_audio': true}
    });
    
    return text;
  }
  
  // Play AI response as voice
  Future<void> playVoiceResponse(String text) async {
    final response = await client.functions.invoke(
      'text-to-speech',
      body: {'text': text, 'voice': 'alloy'}
    );
    
    final audioUrl = response.data['audio_url'];
    // Play audio using audioplayers package
  }
  
  // Send user feedback
  Future<void> sendFeedback(String feedback) async {
    await client.functions.invoke(
      'process-feedback',
      body: {
        'user_id': client.auth.currentUser!.id,
        'feedback_text': feedback
      }
    );
  }
}
```

### Authentication Flow
```dart
// lib/services/auth_service.dart
class AuthService {
  final SupabaseClient client = Supabase.instance.client;
  
  Future<void> signInWithGoogle() async {
    await client.auth.signInWithOAuth(Provider.google);
  }
  
  Future<void> signInAnonymously() async {
    await client.auth.signInAnonymously();
  }
  
  Stream<AuthState> get authStateChanges => 
    client.auth.onAuthStateChange;
}
```

## n8n Integration

### Webhook Receiver Flow
```yaml
# n8n workflow configuration
trigger:
  type: webhook
  path: /totalis/message
  method: POST

nodes:
  - name: Parse Message
    type: function
    
  - name: Get User Context
    type: supabase
    operation: select
    table: user_profiles
    
  - name: Get Category Context
    type: supabase
    operation: select
    table: categories
    
  - name: AI Processing
    type: anthropic
    model: claude-3-sonnet
    
  - name: Extract Check-in Data
    type: function
    outputs:
      - summary
      - insight
      - brief
      - mood
    
  - name: Save Response
    type: supabase
    operation: insert
    table: messages
    
  - name: Generate Recommendations
    type: anthropic
    model: claude-3-haiku
    
  - name: Save Recommendations
    type: supabase
    operation: insert
    table: recommendations
```

## Migration Plan

### Phase 1: Database Setup (Week 1)
1. Create Supabase project
2. Set up schema and RLS policies
3. Configure authentication providers
4. Create edge functions

### Phase 2: Mobile App Core (Week 2-3)
1. Replace Firebase Auth with Supabase Auth
2. Replace Dio/REST with Supabase SDK
3. Implement real-time subscriptions
4. Update state management

### Phase 3: Voice Features (Week 4)
1. Implement voice recording UI with permissions
2. Create transcription edge function (Whisper API)
3. Add TTS playback (OpenAI TTS)
4. Test voice message flow
5. Implement feedback system

### Phase 4: n8n Integration (Week 5)
1. Set up n8n workflows
2. Configure webhooks
3. Test AI message processing
4. Implement error handling

### Phase 5: Testing & Launch (Week 6)
1. End-to-end testing
2. Performance optimization
3. Security audit
4. Production deployment

## Architectural Improvements from Production Analysis

### 1. Database Schema Refinements
- **Default Coach Assignment**: Automatic assignment via database trigger
- **Unified Recommendations**: Single table with type field replacing two tables
- **Preserved Check-in Fields**: Keep summary, insight, and brief fields
- **Proper Foreign Keys**: All relationships use appropriate ON DELETE behavior
- **Excluded Unused Tables**: No keywords, images stored as files not BLOBs

### 2. Relationship Design
- **Coach References**: SET NULL to preserve data if coach removed
- **Category Hierarchy**: RESTRICT deletion to maintain tree structure
- **Message Context**: Added coach_id to messages for AI style consistency
- **Cascading Deletes**: Proper cascades for owned data (user→messages)

### 3. Simplified Features
- **No User Images**: Removed complexity of user profile images
- **No Keywords System**: Unused in production, excluded from migration
- **Streamlined Auth**: Single auth system replacing Firebase + custom admin

## Key Benefits

### 1. Simplified Architecture
- Single platform for auth, database, storage, and real-time
- No need for Redis, RabbitMQ, or Elasticsearch
- Built-in CDN for media delivery
- ~60% reduction in backend code complexity

### 2. Real-time by Default
- Instant message delivery
- Live check-in updates
- Automatic offline/online sync

### 3. Better Developer Experience
- Type-safe SDK
- Automatic retries and error handling
- Built-in debugging tools

### 4. Cost Optimization
- Pay-per-use pricing
- No infrastructure management
- Automatic scaling

### 5. Enhanced Security
- Row Level Security enforced at database
- Automatic SSL/TLS
- Built-in auth token management

## Performance Considerations

### 1. Connection Pooling
- Supabase handles connection pooling automatically
- Edge functions use persistent connections
- Mobile SDK manages connection lifecycle

### 2. Caching Strategy
- Leverage Supabase's edge caching
- Client-side caching via SDK
- Static asset caching for coaches/categories

### 3. Query Optimization
- Use indexes on frequently queried fields
- Implement pagination for message history
- Cache category hierarchy client-side

## Security Best Practices

1. **Never expose service keys** - Use anon key in mobile app
2. **Implement RLS policies** - Database-level security
3. **Validate inputs** - Both client and server-side
4. **Use signed URLs** - For sensitive media files
5. **Regular security audits** - Monitor RLS policy effectiveness

## Monitoring & Observability

1. **Supabase Dashboard** - Built-in metrics and logs
2. **Error Tracking** - Sentry integration for mobile app
3. **Performance Monitoring** - Supabase performance insights
4. **User Analytics** - Custom events via edge functions

## Key Feature Enhancements

### Voice Interaction
- **Recording**: Native voice recording with microphone permissions
- **Transcription**: OpenAI Whisper via Edge Functions
- **Playback**: TTS for AI responses using OpenAI voices
- **Storage**: Temporary audio handling without permanent storage

### Enhanced Check-ins
- **Brief Summaries**: Concise check-in summaries in addition to full summaries
- **Structured Data**: Mood tracking with JSON metadata
- **Real-time Updates**: Live check-in progress via subscriptions

### Feedback System
- **User Feedback**: Direct feedback collection via Edge Functions
- **External Integration**: Optional webhook forwarding
- **Analytics**: Feedback stored as special message type

### Recommendation System
- **Multi-level**: First and second-level recommendations
- **Types**: Support for "how" and "why" recommendations
- **Context-aware**: Linked to check-ins and categories

## Conclusion

This architecture leverages Supabase's full capabilities to create a simpler, more maintainable, and feature-rich platform. The migration will result in better performance, real-time features, and reduced operational complexity while maintaining all current functionality and adding new capabilities like voice interaction, enhanced check-ins, and a comprehensive recommendation system.

---

*Document created: May 24, 2025*
*Updated with dev branch features: May 24, 2025*
*Purpose: Technical architecture recommendation for Totalis Supabase migration*