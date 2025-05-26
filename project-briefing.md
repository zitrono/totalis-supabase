# Totalis Project Briefing - Supabase Migration

## Project Overview

Totalis is an AI-driven personal health and wellness coaching platform that provides personalized coaching experiences through AI-powered conversations, wellness check-ins, and guided self-improvement journeys. The platform is not yet live, eliminating the need for user data migration.

## Current Architecture Summary

### Backend (FastAPI/Python)
- **Framework**: FastAPI with Python 3.11
- **Database**: PostgreSQL with SQLAlchemy/SQLModel
- **Authentication**: Firebase Authentication
- **AI Integration**: Anthropic Claude (via AWS Bedrock)
- **Additional Services**: Redis (caching), RabbitMQ (message queue), Elasticsearch (search)
- **API Pattern**: RESTful API with JWT token validation

### Mobile Frontend (Flutter)
- **Framework**: Flutter 3.0.6+ with Dart
- **State Management**: Provider pattern with ChangeNotifier
- **Authentication**: Firebase Auth (Google Sign-In + Anonymous)
- **Networking**: Dio HTTP client for REST API calls
- **Platform Support**: iOS, Android, Web, macOS, Windows, Linux
- **Real-time Features**: Currently using polling (not true real-time)

## Latest Features (Dev Branch - April 2025)

### Voice Interaction
- **Speech-to-Text**: Voice recording with OpenAI Whisper transcription
- **Text-to-Speech**: AI responses playable as audio via OpenAI TTS
- **Microphone Permissions**: Permission handling for voice features
- **Audio Controls**: Full playback controls for voice responses

### Enhanced Check-ins
- **Brief Summaries**: New "brief" field for concise check-in summaries
- **Three-tier Summary System**: Brief, summary, and insight levels
- **Improved UI**: Better visual presentation of check-in results

### Feedback System
- **User Feedback**: Direct feedback collection via dedicated UI
- **External Webhook**: Integration with feedback processing service
- **Feedback Screens**: New dedicated feedback pages and flows

### UI/UX Improvements
- **Animations**: Coach selector animations, card shuffling effects
- **Early Access**: Early access button and features
- **Health Navigator 3.0**: Redesigned health navigation interface
- **Cards 3.0**: Enhanced recommendation card system with delete timers

## Core Data Models

### User System
```
tls_user
├── id: UUID
├── firebase_id: String (currently tied to Firebase)
├── coach_id: UUID (assigned AI coach)
├── sex: Enum
├── year_of_birth: Integer
├── notification_settings: JSON
├── mood_config: JSON
└── timestamps
```

### Content Hierarchy
```
tls_category (hierarchical wellness topics)
├── id: UUID
├── parent_id: UUID (self-referential)
├── title: String
├── prompt: Text (AI prompt template)
├── guideline: Text
├── icon: String
├── role: Enum (USER/ASSISTANT)
├── order: Integer
└── timestamps

tls_category_keyword (category tagging)
├── category_id: UUID
├── keyword_id: UUID
└── timestamp
```

### Messaging System
```
tls_message
├── id: UUID
├── firebase_id: String (user reference)
├── session_id: UUID
├── role: Enum (USER/ASSISTANT)
├── content: Text
├── raw_content: Text (original AI response)
├── references: JSON
└── timestamps

tls_check_in (wellness check-ins)
├── id: UUID
├── firebase_id: String
├── category_id: UUID
├── session_id: UUID
├── initial_message: Text
├── summary: Text
├── insight: Text
├── brief: Text (NEW)
├── mood: JSON
└── timestamps
```

### AI Coaching
```
tls_coach (AI coach personalities)
├── id: UUID
├── name: String
├── general_prompt: Text
├── photo: String
├── sex: Enum
├── year_of_birth: Integer
├── bio: Text
└── timestamps

tls_recommendation
├── id: UUID
├── firebase_id: String
├── coach_recommendation: Text
├── recommended_categories: JSON
├── recommendation_type: String (first/second/how/why)
├── parent_id: UUID (for second-level recommendations)
├── context: Text
└── timestamps
```

## Key Features & Workflows

### 1. User Onboarding
- Anonymous or Google Sign-In via Firebase
- Coach selection (AI personality)
- Initial wellness assessment
- Personalized category recommendations

### 2. Chat System
- Context-aware AI conversations
- Voice input via recording with transcription
- Voice output via TTS for AI responses
- Message history tracking
- Mood tracking and analysis
- Currently using REST polling (not real-time)

### 3. Wellness Check-ins
- Category-based check-in flows
- Structured responses (Yes/No, Radio, Checkbox)
- Mood assessment
- AI-generated summaries with three tiers (brief, summary, insight)
- Voice input support during check-ins
- Follow-up scheduling

### 4. Content Management
- Hierarchical category system
- Admin-managed prompts and guidelines
- Keyword-based categorization
- Dynamic content recommendations

### 5. AI Integration
- Anthropic Claude 3.5 Sonnet (primary)
- Claude 3 Haiku (lightweight operations)
- OpenAI Whisper (speech-to-text)
- OpenAI TTS (text-to-speech)
- Complex prompt engineering with user context
- Response parsing and reference extraction

### 6. Recommendation System
- First-level recommendations after check-ins
- Second-level recommendations with parent relationships
- "How" and "Why" recommendation types
- Context-aware suggestions based on user interactions

### 7. Feedback System
- In-app feedback collection
- External webhook integration for processing
- Dedicated feedback UI flows

## Current Pain Points

1. **No Real-time Updates**: Chat uses polling instead of WebSockets
2. **Complex Infrastructure**: Multiple services (Redis, RabbitMQ, Elasticsearch)
3. **Manual Caching**: Custom cache implementation in mobile app
4. **Limited Offline Support**: Basic SharedPreferences caching
5. **Separate Auth System**: Firebase Auth adds complexity
6. **No Streaming**: AI responses don't stream to users

## Migration Goals with Supabase

### Consolidation Benefits
1. **Unified Platform**: Database, Auth, Realtime, Storage in one service
2. **Native SDKs**: Replace REST API with Supabase Dart SDK
3. **Built-in Features**: Leverage Supabase's auth, RLS, realtime, and edge functions
4. **Simplified Architecture**: Remove Redis, RabbitMQ, Elasticsearch dependencies
5. **Better Developer Experience**: Single service to manage

### New Architecture Vision
1. **Authentication**: Supabase Auth (supporting Google + Anonymous)
2. **Database**: Supabase PostgreSQL with Row Level Security
3. **Real-time**: Supabase Realtime for chat and updates
4. **Storage**: Supabase Storage for coach photos and user uploads
5. **Voice Processing**: Supabase Edge Functions for Whisper/TTS
6. **AI Integration**: n8n workflows via API calls (no streaming)
7. **Admin Access**: Direct Supabase table editing

## Critical Migration Considerations

### 1. Data Model Adaptations
- Replace `firebase_id` with Supabase `auth.uid()`
- Implement Row Level Security (RLS) policies
- Design for real-time subscriptions
- Optimize for Supabase's PostgREST API

### 2. Authentication Migration
- Implement Supabase Auth providers (Google, Anonymous)
- Update mobile app authentication flow
- Handle auth state management
- Implement proper RLS policies

### 3. Real-time Features
- Convert polling-based chat to real-time subscriptions
- Implement presence for online status
- Real-time check-in updates
- Live recommendation updates

### 4. AI Integration via n8n
- Design n8n workflows for AI interactions
- Support for multi-tier summaries (brief, summary, insight)
- Recommendation generation (first, second, how, why)
- Implement proper error handling
- Queue management for AI requests

### 5. Admin Interface
- Direct Supabase Dashboard access for admins
- Custom admin panel for complex operations
- Secure admin authentication
- Audit logging for admin actions

### 6. Mobile App Updates
- Replace Dio/REST with Supabase Dart SDK
- Update state management for real-time data
- Implement Supabase Auth UI
- Add voice recording UI with permissions
- Integrate audio playback for TTS
- Leverage Supabase offline support

## Success Criteria

1. **Performance**: Equal or better response times
2. **Reliability**: 99.9% uptime with Supabase infrastructure
3. **Developer Experience**: Simplified codebase and deployment
4. **User Experience**: Real-time updates and better offline support
5. **Cost Efficiency**: Reduced infrastructure complexity
6. **Scalability**: Leverage Supabase's auto-scaling capabilities

## Next Steps

1. Design Supabase schema with RLS policies
2. Plan n8n workflow architecture
3. Create authentication migration strategy
4. Design real-time subscription patterns
5. Plan admin interface requirements
6. Update mobile app architecture plan

---

*Document created: May 24, 2025*
*Updated with dev branch features: May 24, 2025*
*Purpose: Comprehensive briefing for Totalis platform migration to Supabase*