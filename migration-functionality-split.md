# Totalis Migration Functionality Split

## Overview
This document provides a detailed breakdown of all Totalis platform functionality, categorized by what will and will not be migrated to Supabase.

---

## ✅ WILL MIGRATE

### 1. User Management
#### Authentication
- **Google Sign-In**: Via Supabase Auth OAuth provider
- **Anonymous Sign-In**: Via Supabase Auth anonymous sessions
- **Token Management**: Automatic via Supabase SDK
- **Session Handling**: Built-in with Supabase Auth

#### User Profile
- **Basic Profile Data**:
  - Year of birth
  - Sex (gender)
  - Notification settings (JSON)
  - Mood configuration (JSON)
  - Coach assignment (with default fallback)
  - Created/updated timestamps
- **Profile Updates**: `change_parameters` endpoint functionality
- **Profile Retrieval**: `get_parameters` endpoint functionality

### 2. Coach System
#### Coach Management
- **Coach Profiles**:
  - Name, bio, photo
  - Demographics (sex, year of birth)
  - Active/inactive status
- **Coach Selection**: User can choose their AI coach
- **Coach Display**: List all available coaches
- **My Coach**: Get user's assigned coach

#### Implementation in Supabase
- Coaches table with public read access
- User profile stores selected coach_id
- Coach photos in Supabase Storage

### 3. Category System
#### Category Structure
- **Hierarchical Categories**: Parent-child relationships maintained
- **Category Properties**:
  - Name and short name
  - Description
  - Icon reference
  - Sort order
  - Color scheme (primary/secondary)
  - Check-in settings (enabled, history visibility)
  - Follow-up timer
- **Category Retrieval**: Get all categories with hierarchy

#### User Categories
- **Favorites Management**: Mark categories as favorite
- **User-Category Association**: Track which categories user interacts with
- **Category Usage Tracking**: Store user's category preferences

### 4. Messaging System
#### Chat Functionality
- **Message Types**:
  - User messages (text and voice)
  - Assistant responses
  - System messages
- **Message Properties**:
  - Content and role
  - Metadata (mood, references)
  - Token usage tracking
  - Timestamps
- **Real-time Updates**: Via Supabase Realtime subscriptions
- **Message History**: Paginated retrieval of past messages

#### Voice Features
- **Voice-to-Text**: 
  - Audio recording in mobile app
  - Transcription via OpenAI Whisper (Edge Function)
  - Save transcribed text as message
- **Text-to-Speech**:
  - Convert AI responses to audio
  - OpenAI TTS API (Edge Function)
  - Stream audio back to mobile app

### 5. Check-in System
#### Check-in Flow
- **Start Check-in**: Initiate wellness check-in for a category
- **Conversational Check-ins**: 
  - Back-and-forth messaging during check-in
  - AI-guided questions based on responses
  - Mood tracking within check-in
- **Check-in Completion**: Summary and insights generation
- **Check-in History**: Retrieve past check-ins by category

#### Check-in Data
- **Stored Information**:
  - Initial message
  - Full conversation thread
  - Summary and insights
  - Mood data (JSON)
  - Category association
  - Session tracking

### 6. Recommendation System (UNIFIED)
#### Action Recommendations (formerly "first")
- **Direct Actions**: Wellness activities to perform
- **Recommendation Data**:
  - Title and action text
  - Why it's important
  - Action steps
  - Importance level (1-5)
  - Category association

#### Category Recommendations (formerly "second")
- **Exploration Suggestions**: Other categories to check in
- **Recommendation Data**:
  - Target category reference
  - Relevance explanation
  - Why this category helps
  - Importance level

#### Unified Implementation
- **Single Table**: Both types in one recommendations table
- **Type Field**: 'action' or 'category' to distinguish
- **Common Fields**: All recommendations have title, text, importance
- **Retrieval**: Filter by type or get all recommendations

### 7. Image Management
#### Image Storage
- **Upload Images**: Store in Supabase Storage
- **Image Retrieval**: Get images by ID
- **Image References**: Link images to coaches, categories
- **Secure URLs**: Signed URLs for image access

### 8. Real-time Features
#### Subscriptions
- **Message Updates**: Real-time new messages
- **Check-in Updates**: Live check-in progress
- **One-to-One Pattern**: Users only see their own data

### 9. Voice Features (NEW in dev branch)
#### Voice Input/Output
- **Speech-to-Text**:
  - Voice recording in chat and check-ins
  - Transcription via OpenAI Whisper
  - Microphone permission handling
- **Text-to-Speech**:
  - AI response playback
  - OpenAI TTS integration
  - Audio player controls

### 10. Feedback System (NEW in dev branch)
#### User Feedback
- **Feedback Messages**: Direct user feedback collection
- **Webhook Integration**: External feedback processing
- **Feedback UI**: Dedicated feedback screens and flows

### 11. Enhanced Check-ins (NEW in dev branch)
#### Check-in Generated Fields
- **Brief Field**: Quick reference description (shortest)
- **Summary Field**: Comprehensive overview of check-in
- **Insight Field**: Key analytical observation
- **Three-tier System**: Different lengths for different uses
- **Improved UI**: Better check-in result display

#### Coach Context
- **Coach Style**: Messages preserve coach_id for AI consistency
- **Default Coach**: Automatic assignment if user has none

### 12. Mobile App Features
#### State Management
- **Provider Pattern**: Maintained with Supabase SDK
- **Offline Support**: Built-in with Supabase SDK
- **Auto-sync**: Automatic when connection restored

#### UI Features
- **Pull-to-Refresh**: Update data from Supabase
- **Skeleton Loading**: During data fetches
- **Error Handling**: Network and API errors
- **Animations**: Coach selector animations, card shuffling
- **Permission Dialogs**: Microphone access requests

---

## ❌ WILL NOT MIGRATE

### 1. Admin System
#### Admin Authentication
- **Separate Admin Login**: Username/password system
- **Admin Roles**: Super admin vs regular admin
- **Admin Sessions**: Separate from user sessions

#### Admin Functionality
- **User Management**:
  - Delete users by ID
  - Summarize user data
  - View all user data
- **Content Management**:
  - Create/edit categories via API
  - Manage category keywords (broken - wrong foreign keys)
  - Update guidelines
- **System Configuration**:
  - Global settings management
  - Feature flags
  - System variables

**Replacement**: Direct Supabase Dashboard access + app_config table

### 2. Infrastructure Services
#### Message Queue (RabbitMQ)
- **Message Routing**: Complex routing logic
- **Job Queues**: Background job processing
- **Dead Letter Queues**: Failed message handling

**Replacement**: n8n webhooks

#### Caching (Redis)
- **Session Caching**: User session data
- **Response Caching**: API response caching
- **Temporary Data**: Short-lived data storage

**Replacement**: Supabase SDK caching

#### Search (Elasticsearch)
- **Full-Text Search**: Content searching
- **Log Aggregation**: Application logs
- **Analytics**: Search analytics

**Replacement**: Supabase full-text search

#### Logging (Logstash)
- **Centralized Logging**: All services
- **Log Processing**: Parsing and enrichment
- **Log Storage**: Long-term retention

**Replacement**: Supabase logs

### 3. Advanced AI Features
#### User Summarization
- **AI-Generated Summaries**: User behavior analysis
- **Summarization Endpoints**: `/users/summarize/id/{id}`
- **Database Fields**: `summarization`, `summarization_count`

**Reason**: Not used by mobile app

#### Prompt Engineering
- **Category Prompts**: Custom prompts per category
- **Prompt Templates**: Complex template system
- **Guideline Integration**: Google Docs parsing

**Reason**: All chats are generic now

### 4. Content Management
#### Keyword System
- **Keyword Tables**: `tls_keyword`, `tls_category_keyword`
- **Keyword Management**: CRUD operations
- **Category Tagging**: Associate keywords with categories

**Reason**: Tables unused in codebase, foreign keys incorrectly point to tls_coach

#### Guideline Parsing
- **Google Docs Integration**: Parse external documents
- **Background Jobs**: `GuidelineParsingJob`
- **Guideline Storage**: Store parsed content

**Reason**: Admins will manage directly

### 5. Account Features
#### Account Linking
- **Bind Accounts**: Link multiple auth methods
- **Account Merging**: Combine user data

**Reason**: Not in mobile UI

#### Account Deletion
- **Self-Service Deletion**: User delete own account
- **Data Cleanup**: Remove all user data

**Reason**: Handle via support

### 6. API Features
#### Message Editing
- **Edit Check-in Messages**: Modify after sending
- **Edit History**: Track message changes

**Reason**: Not in mobile UI

#### Proposal System
- **Check-in Proposals**: AI-suggested check-ins
- **Proposal Ranking**: Score proposals

**Reason**: Not actively used

#### Error Testing
- **Error Endpoint**: `/account/error`
- **Test Scenarios**: Simulate errors

**Reason**: Development only

### 7. Background Jobs
#### Parsing Jobs
- **Guideline Parsing**: Process Google Docs
- **Content Updates**: Scheduled updates

**Replacement**: Manual updates

#### Test Jobs
- **Test Run Job**: System testing
- **Performance Tests**: Load testing

**Reason**: Not needed

### 8. Variable System
#### Generic Variables
- **Variable Storage**: Key-value store
- **Variable Types**: Different data types
- **Variable Endpoints**: CRUD operations

**Simplification**: Basic config table

---

## Migration Statistics

### Endpoints
- **Current**: ~50 endpoints
- **After Migration**: ~25 endpoints (increased due to dev branch features)
- **Reduction**: 50%

### Database Tables
- **Current**: 15+ tables
- **After Migration**: 7 tables
- **Reduction**: 53%

### External Services
- **Current**: 7 services (PostgreSQL, Redis, RabbitMQ, Elasticsearch, Firebase, Logstash, AWS)
- **After Migration**: 2 services (Supabase, n8n)
- **Reduction**: 71%

### Code Complexity
- **Backend Code**: ~70% reduction
- **Mobile Code**: ~30% reduction (auth and API layer)
- **Overall**: ~50% simpler

---

## Key Architectural Decisions (Based on Production Analysis)

### 1. Database Schema Improvements
- **Unified Recommendations**: Single table with type field instead of two separate tables
- **Check-in Fields**: Preserve all three AI-generated fields (brief, summary, insight)
- **Default Coach**: Automatic assignment via database trigger
- **Proper Relationships**: All foreign keys use appropriate ON DELETE behavior

### 2. Excluded Features (Confirmed Unused)
- **Keywords System**: Tables have broken foreign keys, not used in code
- **User Images**: No implementation needed, simplifies schema
- **Admin System**: Replace with direct Supabase dashboard access
- **Complex Prompts**: Categories keep prompt fields but implementation simplified

### 3. Enhanced Features
- **Coach Context**: Messages now include coach_id for AI style consistency
- **Category Protection**: RESTRICT deletion prevents breaking hierarchy
- **Real-time Everything**: All data changes available via subscriptions
- **Voice Integration**: Full speech-to-text and text-to-speech support

### 4. Migration Benefits
- **No Data Loss**: All active features preserved
- **Better Performance**: Fewer tables, optimized indexes
- **Improved Security**: RLS policies at database level
- **Simpler Operations**: No Redis, RabbitMQ, or Elasticsearch to manage

---

*Document created: May 24, 2025*
*Updated: May 25, 2025 (with production analysis findings)*
*Purpose: Detailed functionality split for Supabase migration*