# Totalis Supabase Documentation

Complete documentation for the Totalis wellness platform migration to Supabase.

## 📚 Documentation Index

### 🎯 Getting Started
- [Project README](../README.md) - Quick start and overview
- [Migration Plan](../migration-plan.md) - Detailed phase-by-phase migration plan
- [Project Configuration](../PROJECT-CONFIG.md) - Business rules and settings

### 🏗️ Architecture & Design
- [Database Schema](../supabase-database-schema.md) - Complete database structure
- [Frontend Architecture](../frontend-architecture.md) - Flutter mobile app architecture
- [Backend Architecture](../backend-architecture.md) - Current FastAPI architecture
- [Architecture Recommendation](../architecture-recommendation.md) - Migration strategy

#### 📊 Auto-Generated Type Documentation
These files are automatically updated after each production deployment:
- [database.types.ts](database.types.ts) - TypeScript type definitions (auto-generated)
- [types-generated.txt](types-generated.txt) - Generation timestamp and commit info

Note: SQL schema dump is not generated due to IPv6 connectivity limitations in GitHub Actions.

### 🔧 Technical Implementation

#### Edge Functions ✅ DEPLOYED
- [Edge Functions API](../EDGE_FUNCTIONS_API.md) - Complete API reference
- [Audio Transcription API](audio-transcription-api.md) - Secure OpenAI Whisper integration
- **Status**: All 7 functions deployed and operational
- **Features**: Rate limiting, analytics, server-side API keys, full security

#### Test Client
- [Test Client Specification](../supabase-test-client-specification.md) - Testing framework
- [Test Client README](../src/test-client/README.md) - Test client usage

### 📱 Mobile App Migration
- [Flutter API Migration Analysis](../flutter-api-migration-analysis.md) - API mapping and gaps
- [Migration Functionality Split](../migration-functionality-split.md) - Feature breakdown

### 🔐 Setup & Configuration
- [Authentication Setup](../AUTH_SETUP.md) - Configure auth providers
- [GitHub Secrets Setup](../GITHUB_SECRETS_SETUP.md) - CI/CD configuration
- [Migration Inputs Needed](../MIGRATION-INPUTS-NEEDED.md) - Required information

### 📊 Analysis & Planning
- [Production Database Analysis](../production-database-analysis.md) - Current state
- [Production Migration Analysis](../production-migration-analysis.md) - Migration approach
- [Database Relationships Validation](../database-relationships-validation.md) - Data integrity
- [Deprecated Features Analysis](../deprecated-features-analysis.md) - Features to remove

### 🚀 Deployment & Operations
- [Schema Application Guide](../SCHEMA_APPLICATION.md) - Database setup
- [Project Briefing](../project-briefing.md) - Executive summary

## 📝 Quick Reference

### Database Migrations
1. `001_initial_schema.sql` - Core tables with RLS
2. `002_fix_health_cards_index.sql` - Performance optimization
3. `003_fix_user_trigger.sql` - User creation automation
4. `004_fix_health_cards_insert_rls.sql` - Security fix
5. `005_add_initial_greeting.sql` - Welcome messages
6. `006_add_voice_transcriptions.sql` - Voice tracking
7. `007_add_audio_usage_logs.sql` - Analytics

### Edge Functions (7 Total)
1. **audio-transcribe** - Secure audio to text (NEW)
2. **checkin-start** - Initialize wellness check-ins
3. **checkin-process** - Handle check-in responses
4. **chat-ai-response** - AI-powered chat
5. **recommendations** - Personalized health tips
6. **analytics-summary** - User statistics
7. **langflow-webhook** - AI integration webhook

### Test Scenarios (5 Total)
1. **New User** - Complete onboarding flow
2. **Chat Interaction** - AI chat testing
3. **Category Check-in** - Wellness assessments
4. **Abort Check-in** - Error handling
5. **Audio Upload** - Transcription testing (NEW)

### Key Features
- ✅ Anonymous & Google authentication
- ✅ Hierarchical categories (96 total)
- ✅ AI coach system (Daniel as default)
- ✅ Dynamic check-ins (3-10 questions)
- ✅ Health cards & recommendations
- ✅ Secure audio transcription
- ✅ Usage analytics & billing

### Security Features
- Row Level Security on all tables
- Server-side API key storage
- Rate limiting (10 req/min for audio)
- JWT token validation
- File size/type validation
- Generic error messages

## 🛠️ Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run test scenarios
npm run test:scenarios

# Test specific feature
npm run test:audio
```

### Deployment Checklist
- [ ] Docker Desktop installed
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Langflow webhook configured

## 📞 Support & Resources

### Internal Resources
- Test Client: `npm run test:interactive`
- Schema Check: `npm run check:schema`
- Connection Test: `npm run test:connection`

### External Resources
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [Flutter Supabase SDK](https://pub.dev/packages/supabase_flutter)

---

*Documentation last updated: January 25, 2025*