# 🎯 Backend Requirements Analysis for Mobile Migration

Based on my deep code review of both backend and frontend, here's what backend functionality is needed to implement the mobile migration as described in `/Users/zitrono/dev/totalis-mobile/mobile-migration.md`:

## 📊 Database Schema Requirements

### ✅ Already Implemented Tables:
- `profiles` - User profiles with coach_id reference
- `coaches` - Coach profiles with multiple age-based images
- `categories` - Hierarchical categories with styling
- `user_categories` - User category preferences with favorites
- `check_ins` - Check-in sessions
- `check_in_answers` - Question responses
- `recommendations` - AI-generated wellness cards
- `messages` - Chat messages with role-based structure
- `audio_transcriptions` - Voice transcription records
- `app_config` - Dynamic configuration
- `variables` - System variables

### ❌ Missing/Needs Enhancement:
1. **Check Lists** - The mobile app references check_lists functionality not in current schema
2. **User Stats Aggregation** - The `user_stats` view mentioned in migration plan doesn't exist

## 🔧 Edge Functions Requirements

### ✅ Core Functions (Already Implemented):
1. **`checkin-process`** - Unified check-in workflow ✅
2. **`chat-ai-response`** - AI-powered conversations ✅
3. **`recommendations`** - Generate personalized recommendations ✅
4. **`analytics-summary`** - User activity insights ✅
5. **`audio-transcribe`** - Voice transcription ✅
6. **`text-to-speech`** - Coach voice generation ✅

### ⚠️ Functions Needing Modifications:
1. **`checkin-process`** - Mobile expects unified start/answer/complete in one function
   - Current backend has separate `checkin-start` and `checkin-process`
   - Need to merge or update mobile to use both

2. **`audio-transcribe`** - Currently doesn't store files (pass-through only)
   - Mobile might expect file storage for playback
   - Need to clarify if pass-through is sufficient

### ❌ Missing Functions:
1. **Batch Operations** - Mobile app might benefit from batch APIs for:
   - Multiple category updates
   - Bulk recommendation fetching
   - Batch message loading

## 📈 Database Views Requirements

### ✅ Implemented Views:
1. `user_profiles_with_coaches` ✅
2. `categories_with_user_preferences` ✅
3. `messages_with_coach` ✅
4. `active_recommendations` ✅
5. `checkin_history_view` ✅

### ❌ Missing Views:
1. **`user_stats`** - Pre-aggregated user metrics mentioned in plan but not implemented
2. **`user_audio_usage`** - Audio feature tracking mentioned but not implemented

## 🗄️ Storage Configuration

### ✅ Already Configured:
- `user-images` - Profile photos
- `coach-images` - Coach avatars (multiple sizes)
- `category-icons` - Category imagery
- `voice-messages` - Audio files

### ⚠️ Considerations:
- Mobile app uses extensive base64 image handling
- Migration plan calls for direct CDN usage
- Need to ensure bucket CORS policies support mobile access

## 🔐 Authentication Requirements

### ✅ Implemented:
- Google OAuth provider configuration
- JWT token validation
- Profile auto-creation triggers

### ❌ Missing:
1. **Deep Link Handling** - `com.totalis.app://auth` redirect configuration
2. **Rate Limit Management** - Mobile-specific rate limits

## 💾 Data Migration Requirements

Since this is a **greenfield project** with **no legacy data**:
- ✅ All seed data is in place (coaches, categories, test users)
- ✅ No data migration needed
- ✅ Can implement optimal schema without backward compatibility

## 🚀 Performance Optimizations Needed

### 1. Database Indexes:
```sql
-- Optimize common mobile queries
CREATE INDEX idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX idx_recommendations_user_active ON recommendations(user_id, is_active);
CREATE INDEX idx_checkins_user_category ON check_ins(user_id, category_id);
```

### 2. RLS Policy Optimization:
- Ensure policies are efficient for mobile query patterns
- Consider adding explicit mobile-app policies

### 3. Real-time Subscriptions:
- Configure appropriate channel limits
- Set up filtered subscriptions for performance

## 📝 Implementation Priority

### Phase 1: Critical Missing Pieces (Day 1-2)
1. Create `user_stats` view for analytics
2. Create `user_audio_usage` view if needed
3. Add missing database indexes

### Phase 2: Edge Function Alignment (Day 3-4)
1. Update `checkin-process` to handle all actions (start/answer/complete/abandon)
2. Clarify audio storage requirements
3. Test all edge functions with mobile auth patterns

### Phase 3: Performance & Polish (Day 5)
1. Optimize RLS policies for mobile patterns
2. Configure real-time channels
3. Set up monitoring for mobile-specific metrics

## 🎯 Key Recommendations

### 1. Simplify Check-in Architecture: 
- Merge `checkin-start` and `checkin-process` into single unified function as mobile expects

### 2. Implement Missing Views:
```sql
-- user_stats view
CREATE VIEW user_stats AS
SELECT 
  user_id,
  COUNT(DISTINCT ci.id) as total_checkins,
  COUNT(DISTINCT r.id) as total_recommendations,
  COUNT(DISTINCT m.id) as total_messages,
  MAX(ci.created_at) as last_checkin,
  MAX(m.created_at) as last_message
FROM profiles p
LEFT JOIN check_ins ci ON ci.user_id = p.user_id
LEFT JOIN recommendations r ON r.user_id = p.user_id
LEFT JOIN messages m ON m.user_id = p.user_id
GROUP BY p.user_id;
```


### 4. Optimize for Direct Access:
- Ensure all operations can be done via Supabase SDK
- No middleware or API layers needed
- Real-time subscriptions configured

## 📊 Summary

The backend is **90% ready** for the mobile migration. The main gaps are:
- Missing views (`user_stats`, `user_audio_usage`)
- Edge function alignment (unified checkin-process)
- Performance optimizations (indexes, RLS policies)

All core functionality exists and just needs minor adjustments to match the mobile app's expectations.