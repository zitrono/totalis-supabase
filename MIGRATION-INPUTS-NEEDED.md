# Totalis Supabase Migration - Required Inputs

## 1. Supabase Setup

### Supabase Project Credentials
- [ ] **SUPABASE_URL**: Your project URL (e.g., https://xxxxx.supabase.co)
- [ ] **SUPABASE_ANON_KEY**: Public anonymous key
- [ ] **SUPABASE_SERVICE_KEY**: Service role key (admin access)
- [ ] **SUPABASE_JWT_SECRET**: For token verification

### Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login
```

## 2. API Keys & External Services

### OpenAI (for voice features)
- [ ] **OPENAI_API_KEY**: For Whisper (speech-to-text) and TTS
- [ ] **OPENAI_ORG_ID**: Organization ID (if applicable)

### Anthropic (for AI conversations)
- [ ] **ANTHROPIC_API_KEY**: For Claude API
- [ ] **ANTHROPIC_MODEL**: Preferred model (e.g., claude-3-sonnet)

### Google OAuth
- [ ] **GOOGLE_CLIENT_ID**: OAuth 2.0 client ID
- [ ] **GOOGLE_CLIENT_SECRET**: OAuth 2.0 client secret
- [ ] **REDIRECT_URI**: OAuth callback URL

## 3. Production Database Access

### SSH & Database
- [ ] **SSH_HOST**: 194.163.136.137 (already have)
- [ ] **SSH_USER**: root (already have)
- [ ] **DB_USER**: totalis (already have)
- [ ] **DB_PASSWORD**: xdX87dBJWHZ (already have)
- [ ] **DB_NAME**: totalis (already have)

## 4. GitHub Configuration

### Repository Secrets (for GitHub Actions)
```bash
# Add these secrets to the repository
gh secret set SUPABASE_URL
gh secret set SUPABASE_ANON_KEY
gh secret set SUPABASE_SERVICE_KEY
gh secret set OPENAI_API_KEY
gh secret set ANTHROPIC_API_KEY
```

## 5. n8n Setup (Future)

### n8n Webhook URL
- [ ] **N8N_WEBHOOK_URL**: Endpoint for AI processing (later)
- [ ] **N8N_API_KEY**: Authentication for n8n (if needed)

## 6. Development Tools

### Local Development
```bash
# Node.js (v18+)
node --version

# TypeScript
npm install -g typescript

# Testing tools
npm install -g jest

# Flutter (for mobile testing)
flutter --version
```

## 7. Migration Decisions Needed

### Business Logic Clarifications
1. **Default Coach Selection**
   - Which coach should be the default? (Daniel?)
   - Fallback if default coach is inactive?

2. **Anonymous Users**
   - Expiration period for anonymous sessions?
   - Data retention policy?

3. **Voice Features**
   - Audio file size limits?
   - Supported audio formats?
   - Storage duration for recordings?

4. **Check-in Process**
   - Maximum messages per check-in?
   - Timeout for incomplete check-ins?

5. **Recommendations**
   - How many recommendations per check-in?
   - Recommendation expiration?

### Data Migration Specifics
1. **Coach Images**
   - Current image storage location?
   - Image transformation needed?

2. **Category Icons**
   - Icon format and storage?
   - Fallback icons?

3. **System Configuration**
   - Which tls_variable entries are still relevant?
   - Which tls_system settings to migrate?

## 8. Testing Configuration

### Test Data
- [ ] Sample coaches data
- [ ] Sample categories hierarchy
- [ ] Test user credentials
- [ ] Mock AI responses

## 9. Monitoring & Analytics

### Error Tracking
- [ ] **SENTRY_DSN**: (optional) Error tracking
- [ ] **LOGFLARE_API_KEY**: (optional) Log aggregation

### Analytics
- [ ] **POSTHOG_API_KEY**: (optional) Product analytics
- [ ] **MIXPANEL_TOKEN**: (optional) User analytics

## 10. Legal & Compliance

### Terms & Policies
- [ ] Privacy policy URL
- [ ] Terms of service URL
- [ ] Data processing agreement

## Setup Commands

```bash
# Clone the repository
cd /Users/zitrono/dev/totalis-supabase

# Initialize the project
npm init -y
npm install @supabase/supabase-js typescript jest @types/jest

# Create project structure
mkdir -p src/{api,migration,tests,utils}
mkdir -p supabase/{functions,migrations}
mkdir -p .github/workflows

# Create environment file
cat > .env.example << EOF
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EOF

# Copy example to actual env (don't commit this)
cp .env.example .env
```

## Next Steps

1. **Provide Required Keys**: Fill in the credentials above
2. **Answer Business Questions**: Clarify the migration decisions
3. **Confirm Architecture**: Review the proposed structure
4. **Begin Phase 1**: Start with test client setup

---

*Document created: May 25, 2025*
*Purpose: Checklist of all inputs needed for migration*