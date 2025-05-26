# Totalis Supabase Migration

Complete migration of Totalis wellness platform from FastAPI/Firebase to Supabase infrastructure.

## Project Status

🎉 **Phase 5 Complete!** - Backend is feature-complete and ready for mobile app migration

### Progress Overview
- ✅ **Phase 1**: Test Client & GitHub Setup (98% complete)
- ✅ **Phase 2**: Supabase Infrastructure (100% complete)
- ✅ **Phase 3**: Production Data Migration (100% complete)
- ✅ **Phase 4**: Edge Functions & Audio Integration (100% complete)
- ✅ **Phase 5**: Core Features Implementation (100% complete)
- ⬜ **Phase 6**: Mobile App Migration (Ready to start)
- ⬜ **Phase 7**: Production Launch (Not started)

### Phase 5 Achievements
- 💬 **Comprehensive Chat System**: Full conversation management with AI responses
- ✅ **Dynamic Check-in Flow**: Complete wellness assessments with insights
- 🎯 **Recommendation Engine**: Personalized recommendations with actions
- 📊 **Analytics Integration**: Sentry error tracking + PostHog user analytics
- 🧪 **Enhanced Testing**: 8 comprehensive test scenarios all passing
- 🔍 **Monitoring**: Error logging, performance tracking, and user events

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Anonymous/public key
- `SUPABASE_SERVICE_KEY` - Service role key (admin access)
- `OPENAI_API_KEY` - For audio transcription

Configured Supabase secrets (for edge functions):
- `OPENAI_API_KEY` - OpenAI Whisper API for audio transcription
- `SENTRY_DSN` - Error tracking and monitoring
- `POSTHOG_API_KEY` - User analytics and feature tracking

### 3. Test Client

Run all test scenarios:
```bash
npm run test:scenarios
```

Run specific scenarios:
```bash
npm run test:new-user      # New user onboarding
npm run test:audio         # Audio upload & transcription
npm run test:chat          # Comprehensive chat system
npm run test:checkin       # Full check-in flow
npm run test:recommendations # Recommendation system
npm run test:interactive   # Interactive testing mode
```

## Project Structure

```
totalis-supabase/
├── src/
│   ├── test-client/      # Comprehensive test client
│   │   ├── services/     # Service implementations
│   │   ├── scenarios/    # Test scenarios
│   │   └── cli.ts        # CLI interface
│   ├── config/           # Configuration management
│   └── migration/        # Data migration scripts
├── supabase/
│   ├── functions/        # Edge Functions (7 implemented)
│   │   ├── audio-transcribe/    # Secure OpenAI integration
│   │   ├── checkin-start/       # Check-in initialization
│   │   ├── checkin-process/     # Check-in responses
│   │   ├── chat-ai-response/    # AI chat
│   │   ├── recommendations/     # Personalized tips
│   │   ├── analytics-summary/   # User analytics
│   │   └── langflow-webhook/    # AI integration
│   └── migrations/       # Database schema (7 migrations)
├── docs/                 # Comprehensive documentation
└── scripts/              # Utility scripts
```

## Key Features Implemented

### 1. Database Schema ✅
- 17 tables with comprehensive relationships
- Row Level Security (RLS) on all tables
- User profiles with default coach assignment
- Categories with hierarchical structure
- Messages with conversation management
- Dynamic check-ins with state tracking
- Personalized recommendations system
- Voice transcription tracking
- Analytics and usage logs

### 2. Authentication ✅
- Anonymous sign-in
- Google OAuth
- Automatic profile creation
- Default coach (Daniel) assignment

### 3. Test Client ✅
- 5 comprehensive test scenarios
- CLI interface for testing
- Service implementations for all features
- Mock data generation

### 4. Edge Functions 🔶
All functions implemented with tests, deployment pending:

#### Audio Transcription (NEW)
- **Secure**: OpenAI API key stored server-side
- **Rate Limited**: 10 requests/minute per user
- **Analytics**: Usage tracking for billing
- **Formats**: webm, m4a, mp3, wav, ogg, flac
- **Size Limit**: 25MB per file

See [Audio Transcription API Docs](docs/audio-transcription-api.md)

## Documentation

### Core Documents
- [Migration Plan](migration-plan.md) - Detailed phase-by-phase plan
- [Project Configuration](PROJECT-CONFIG.md) - Business rules & settings
- [Database Schema](supabase-database-schema.md) - Complete schema docs
- [Edge Functions API](EDGE_FUNCTIONS_API.md) - API reference

### Technical Guides
- [Audio Transcription API](docs/audio-transcription-api.md) - Secure audio processing
- [Flutter Migration Analysis](flutter-api-migration-analysis.md) - Mobile app migration
- [Test Client Specification](supabase-test-client-specification.md) - Testing guide
- [Edge Functions Status](edge-functions-status.md) - Implementation status

### Setup Guides
- [Authentication Setup](AUTH_SETUP.md) - Configure auth providers
- [GitHub Secrets Setup](GITHUB_SECRETS_SETUP.md) - CI/CD configuration
- [Edge Functions Deployment](edge-functions-deployment-guide.md) - Deployment guide

## Deployment

### Edge Functions (Requires Docker)
```bash
# 1. Install Docker Desktop
# 2. Set environment variables
npx supabase secrets set OPENAI_API_KEY=sk-your-key-here

# 3. Deploy all functions
npx supabase functions deploy

# 4. Deploy specific function
npx supabase functions deploy audio-transcribe
```

### Database Migrations

**CLI Method (Recommended):**
```bash
# Apply all pending migrations with password flag
npx supabase db push -p "your-database-password"
```

**Important Notes:**
- Always use the `-p` flag to provide the database password
- Without the flag, you may encounter SCRAM authentication errors
- Reset password from Supabase Dashboard → Settings → Database if needed

**Manual Method (Alternative):**
Apply migrations in Supabase Dashboard SQL editor:
1. `001_initial_schema.sql` - Core tables
2. `002_fix_health_cards_index.sql` - Index fix
3. `003_fix_user_trigger.sql` - User creation trigger
4. `004_fix_health_cards_insert_rls.sql` - RLS fix
5. `005_add_initial_greeting.sql` - Greeting messages
6. `006_add_voice_transcriptions.sql` - Voice tracking
7. `007_add_audio_usage_logs.sql` - Usage analytics

## Key Decisions

### Business Rules
- **Default Coach**: Daniel (configurable)
- **Anonymous Users**: No expiration
- **Voice Recording**: 60 seconds max
- **Check-ins**: AI-driven with 3-10 dynamic questions
- **Audio Formats**: MP3 recommended (16kHz, 32kbps)
- **Rate Limits**: 10 audio transcriptions/minute

### Technical Choices
- **AI Integration**: Langflow (webhooks ready)
- **Storage**: Supabase Storage for audio/images
- **Security**: RLS on all tables, server-side API keys
- **Testing**: Comprehensive test client before mobile migration

## Development Commands

```bash
# Build TypeScript
npm run build

# Run all tests
npm test

# Test scenarios
npm run test:scenarios      # All scenarios
npm run test:new-user       # New user flow
npm run test:audio          # Audio upload
npm run test:interactive    # Interactive mode

# Database operations
npm run check:schema        # Verify schema
npm run test:auth           # Test authentication
npm run test:connection     # Test DB connection

# Development
npm run dev                 # Start dev server
npm run test:watch          # Watch mode
```

## Security Best Practices

1. **API Keys**: Never expose OpenAI or service keys
2. **Environment**: Use `.env` locally, secrets in production
3. **Authentication**: Always validate JWT tokens
4. **Rate Limiting**: Implemented on all Edge Functions
5. **File Validation**: Type and size checks on uploads
6. **Error Messages**: Generic messages, log details server-side

## Next Steps

1. **Deploy Edge Functions** (requires Docker)
2. **Connect Langflow** for AI features
3. **Migrate Flutter App** to Supabase SDK
4. **Performance Testing** with production data
5. **Launch Preparation** and monitoring setup

---

*Last Updated: January 25, 2025*
*Repository: github.com/[your-org]/totalis-supabase*