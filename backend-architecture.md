# Totalis Backend Architecture Analysis

## Overview
Totalis is a Python-based backend application built with FastAPI, focusing on AI-powered mental health and wellness coaching. The application uses a modular architecture with clear separation of concerns.

## Technology Stack

### Core Technologies
- **Framework**: FastAPI with Uvicorn
- **Database**: PostgreSQL with SQLModel/SQLAlchemy
- **Authentication**: Firebase Admin SDK
- **AI Models**: 
  - Anthropic Claude (via AWS Bedrock)
  - OpenAI GPT models
- **Async Support**: asyncpg, aio_pika
- **Caching/Queue**: Redis, RabbitMQ

### Key Dependencies
```toml
python = "^3.11"
fastapi = "^0.110.1"
sqlmodel = "^0.0.21"
firebase-admin = "^6.2.0"
prompt-admin = "^0.1.24"
redis = "^5.0.1"
aio_pika = "^9.3.0"
```

## Architecture Structure

### Module Organization
```
modules/
├── ai/          # AI integration and prompt management
├── backend/     # API routes and FastAPI app
├── chat/        # Chat service logic
├── commons/     # Shared utilities and base classes
├── data/        # Database models and repositories
└── parsing/     # Background jobs for parsing
```

## Database Models & Relationships

### Core Entities

1. **User** (`tls_user`)
   - Firebase UID for authentication
   - Personal info (name, birth date, sex)
   - Links to coach and profile image
   - Summarization fields for AI context
   - Mood configuration (JSON)

2. **Category** (`tls_category`)
   - Hierarchical structure (parent_id)
   - Guidelines and prompts for AI
   - UI configuration (colors, icons)
   - Check-in and follow-up settings

3. **Message** (`tls_message`)
   - Chat history storage
   - Links to user categories and check-ins
   - Role-based (user/assistant)
   - Token usage tracking
   - Answer storage (JSON)

4. **CheckIn** (`tls_checkin`)
   - User progress tracking
   - Level/score system
   - AI-generated summaries and insights

5. **Coach** (`tls_coach`)
   - Virtual coach profiles
   - Custom prompts and introductions
   - Multiple image sizes

6. **Recommendation** (`tls_checkin_recommendation`)
   - AI-generated recommendations
   - Why/How explanations
   - Importance scoring

### Supporting Entities
- **Admin**: Admin user management
- **Image**: Binary image storage
- **Variable**: System configuration
- **Keyword**: Category tagging system
- **System**: Global AI model settings

## API Structure

### Route Organization
```
/api/
├── user/
│   ├── account      # User profile management
│   ├── category     # Category interactions
│   ├── chat         # Main chat interface
│   ├── checkin      # Check-in functionality
│   ├── coach        # Coach selection
│   ├── recommendation # AI recommendations
│   └── variable     # User preferences
├── admin/           # Admin panel endpoints
└── public/          # Public/unauthenticated endpoints
```

### Authentication Flow
1. Client sends Firebase ID token in Authorization header
2. Backend verifies token with Firebase Admin SDK
3. Creates/retrieves local user record linked to Firebase UID
4. Returns `SessionDataUser` or `SessionDataAdmin` for authorized requests

## AI Integration Patterns

### Prompt Service Architecture
- Uses `prompt-admin` library for prompt management
- Multiple AI services configured:
  - **Anthropic Claude 3.5 Sonnet** (via AWS Bedrock) - Primary model
  - **Anthropic Claude 3 Haiku** - Lightweight tasks
  - **OpenAI GPT-4** - Alternative option

### Key AI Features
1. **Category Chat**: Context-aware conversations based on wellness categories
2. **Check-in Analysis**: Mood and progress evaluation
3. **Recommendations**: Personalized action items with why/how explanations
4. **User Summarization**: Periodic profile summarization for better context
5. **Search Query Processing**: Intent understanding for navigation

### Context Management
- User context (profile, history, preferences)
- Category context (guidelines, scope, prompts)
- Reference context (previous interactions)
- History tracking for conversation continuity

## Business Logic & Services

### Service Layer Pattern
- Repository pattern for data access
- Service classes for business logic
- Clear separation between API routes and logic

### Key Services
1. **ChatService**: Main conversation orchestration
2. **UserCategoryService**: User-category relationship management
3. **CheckInService**: Progress tracking logic
4. **RecommendationService**: AI recommendation generation
5. **UserSummarizationService**: Profile analysis

## External Service Integrations

1. **Firebase**
   - Authentication and user management
   - Credentials loaded from `.envs/firebase_credentials.json`

2. **AWS Bedrock**
   - Anthropic Claude model access
   - Configured via environment variables

3. **Logstash**
   - Centralized logging
   - Structured logging with context

4. **Google Services**
   - Google Drive integration for guidelines
   - OAuth for admin features

## Background Jobs
- **GuidelineParsingJob**: Processes category guidelines from Google Drive
- **TestRunJob**: Prompt testing and monitoring

## Critical Configurations

### Environment Variables Required
- `DATABASE_DSN`: PostgreSQL connection
- `ANTHROPIC_KEY`: Anthropic API key
- `FIREBASE_*`: Firebase configuration
- `LOGSTASH_*`: Logging configuration
- `PROMPT_ADMIN_*`: Prompt management settings

### Database Migrations
- Initial schema in `modules/data/migrations/init.sql`
- Additional migrations for schema updates
- Supports both sync and async database connections

## Security Considerations
- Firebase token validation for all user endpoints
- Admin endpoints require additional authorization
- Separate admin entity with enable/disable functionality
- Role-based access control

## Migration Considerations for Supabase

### Key Areas to Address
1. **Authentication**: Migrate from Firebase to Supabase Auth
2. **Database**: PostgreSQL structure is compatible, needs connection update
3. **File Storage**: Image storage currently in database, could use Supabase Storage
4. **Real-time**: Could leverage Supabase real-time for chat
5. **Background Jobs**: Need alternative to current job system
6. **AI Integration**: Maintain current Anthropic/OpenAI integrations