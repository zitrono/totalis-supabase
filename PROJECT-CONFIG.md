# Totalis Supabase Project Configuration

## Supabase Credentials
- **Project URL**: https://qdqbrqnqttyjegiupvri.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcWJycW5xdHR5amVnaXVwdnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxMTg4NjIsImV4cCI6MjA2MzY5NDg2Mn0.PDEqa_SrLYHKFnfL3eTpvZRbxE4cIpbqgSMj-WE90hk
- **Service Role Key**: [Stored in .env file only]

## API Keys
- **OpenAI Key**: [Stored in .env file only]
- **Anthropic**: Not needed - all AI logic handled by n8n
- **Google OAuth**: To be provided later

## Business Rules & Decisions

### User Management
- **Default Coach**: Daniel
- **Anonymous Users**: No expiration
- **User Data**: Fresh start, no migration from production

### Voice Features
- **Recording Limit**: 60 seconds maximum
- **Format**: Will use OpenAI Whisper for transcription
- **Storage**: Supabase Storage bucket

### Check-in Process
- **Flow**: AI generates questions, mobile client keeps answering as long as questions are sent
- **No Fixed Limits**: Dynamic based on AI responses
- **Fields Generated**: summary, insight, brief

### Asset Management
- **Coach Images**: Admins will upload via infrastructure we provide
- **Category Icons**: Admins will upload as SVG files
- **Storage Structure**:
  - `coach-images/` bucket
  - `category-icons/` bucket

### System Configuration
- **Variables**: Served via API to n8n
- **Storage**: app_config table
- **Access**: Read endpoints for n8n

### Integration Points
- **n8n**: Handles all AI logic
- **Edge Functions**: 
  - Voice transcription (OpenAI)
  - n8n webhook (ping-pong initially)
- **Real-time**: Supabase subscriptions

## Services Setup Timeline
- **Sentry**: To be set up later
- **Analytics**: To be set up later
- **n8n Instance**: To be provided later

## Security Notes
- Service role key and API keys are stored in .env file only
- Never commit .env file to repository
- Use GitHub secrets for CI/CD

---

*Created: January 25, 2025*
*Last Updated: January 25, 2025*