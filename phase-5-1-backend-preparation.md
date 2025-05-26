# Phase 5.1: Backend Preparation for Mobile App Migration

## Overview
This phase prepares all backend infrastructure needed for the mobile app migration, ensuring 100% API compatibility before any mobile app changes.

## 1. Edge Functions Implementation (9 Functions)

### 1.1 User Profile Management (`/user-profile`)
**Purpose**: Manage user profile data
**Endpoints to implement**:
- `GET` - Get user profile (replaces `/api/user/account/parameters`)
- `POST` with `action: "update"` - Update profile (replaces `/api/user/account/change_parameters`)
- `POST` with `action: "delete"` - Delete account (replaces `/api/user/account/remove`)

**Request/Response Contract**:
```typescript
// GET Response / POST Update Request & Response
interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  firebase_uid: string;
  is_tester: boolean;
  sex: "M" | "F" | "N" | null;
  birth: string; // ISO date
  coach_id: number;
  image_id: number;
  is_anonymous: boolean;
  summarization: string;
  summarization_count: number;
  time_create: string; // ISO datetime
}
```

**Implementation Details**:
- Map Firebase UID to Supabase user ID
- Handle anonymous users
- Validate sex enum values
- Store image references for later storage migration

### 1.2 Categories Management (`/categories`)
**Purpose**: Retrieve wellness categories
**Endpoint**: `GET` - Get all categories (replaces `/api/user/category/get`)

**Response Contract**:
```typescript
interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  name_short: string;
  icon_id: number;
  icon_id_secondary: number;
  sort_order: number;
  description: string;
  show_checkin_history: boolean;
  checkin_enabled: boolean;
  followup_chat_enabled: boolean;
  followup_timer: number;
  primary_color: string;
  secondary_color: string;
  max_questions: number;
  time_create: string;
}
```

**Implementation Details**:
- Cache categories (they rarely change)
- Return sorted by sort_order
- Include all fields for mobile app compatibility

### 1.3 User Categories (`/user-categories`)
**Purpose**: Manage user's selected categories and favorites
**Endpoints**:
- `GET` - Get user's categories (replaces `/api/user/user_category/get`)
- `POST` with `action: "create"` - Add category (replaces `/api/user/user_category/create`)
- `POST` with `action: "toggle_favorite"` - Update favorite (replaces `/api/user/user_category/change_favorite`)

**Request/Response Contracts**:
```typescript
// GET Response / Create Response
interface UserCategory {
  id: number;
  user_id: number;
  category_id: number;
  is_favorite: boolean;
  time_create: string;
}

// Create Request
interface CreateRequest {
  action: "create";
  category_id: number;
}

// Toggle Favorite Request
interface ToggleFavoriteRequest {
  action: "toggle_favorite";
  user_category_id: number;
  favorite: boolean;
}
```

### 1.4 Coaches Management (`/coaches`)
**Purpose**: Coach selection and retrieval
**Endpoints**:
- `GET` - Get all coaches (replaces `/api/user/coach/get`)
- `GET` with `mine=true` - Get user's coach (replaces `/api/user/coach/my`)
- `POST` with `action: "choose"` - Select coach (replaces `/api/user/coach/choose`)

**Request/Response Contracts**:
```typescript
interface Coach {
  id: number;
  name: string;
  description: string;
  image_id: number;
  image30_id: number;
  image45_id: number;
  image60_id: number;
  sex: "M" | "F";
  intro: string;
  voice: string;
  time_create: string;
}

// Choose Coach Request
interface ChooseCoachRequest {
  action: "choose";
  coach_id: number;
}
```

### 1.5 Chat History (`/chat-history`)
**Purpose**: Retrieve conversation history
**Endpoint**: `POST` - Get messages (replaces `/api/user/chat/get_messages`)

**Request/Response Contracts**:
```typescript
// Request
interface ChatHistoryRequest {
  page: number;
}

// Response
interface Message {
  id: number;
  is_checkin: boolean;
  checkin_id: number | null;
  coach_id: number;
  text: string;
  role: "User" | "Assistant" | "System" | "PreAssistant";
  tokens_used: number;
  gpt_version: string;
  answers: {
    Yes?: string;
    No?: string;
    radio?: string[];
    checkbox?: string[];
  } | null;
  raw_gpt_message: string;
  checkin_end: boolean;
  time_create: string;
  pickedAnswers?: string[];
  pickedRadioAnser?: string;
}
```

### 1.6 Check-in History (`/checkin-history`)
**Purpose**: Historical check-in data
**Endpoints**:
- `POST` with single `user_category_id` - Get check-ins (replaces `/api/user/checkin/get`)
- `POST` with array - Get multiple (replaces `/api/user/checkin/get/user_category`)
- `POST` with `action: "proposal"` - Get proposal (replaces `/api/user/checkin/proposal`)

**Request/Response Contracts**:
```typescript
// Single/Multiple Check-ins Response
interface CheckIn {
  id: number;
  user_category_id: number;
  level: number;
  summary: string;
  insight: string;
  brief: string;
  time_create: string;
}

// Proposal Response
interface CheckInProposal {
  text: string;
  tokensUsed: number;
  gptVersion: string;
  userCategoryId: number;
}
```

### 1.7 App Configuration (`/app-config`)
**Purpose**: Dynamic app configuration
**Endpoints**:
- `GET` with `key=shortcuts` - Get shortcuts (replaces `/api/user/variable/get/shortcuts`)
- `GET` with `key=card_shelf_life_hours` - Get card expiry

**Response Contract**:
```typescript
interface Variable {
  id: number;
  name: string;
  value: string;
  user: boolean;
  timeCreate: string;
}
```

### 1.8 Event Logging (`/log-event`)
**Purpose**: Analytics and user behavior tracking
**Endpoint**: `POST` - Log event (replaces `/api/log_event`)

**Request Contract**:
```typescript
interface LogEventRequest {
  event_name: string;
  timestamp: string;
  // Additional event properties
  [key: string]: any;
}
```

**Implementation Details**:
- Store in analytics_events table
- Forward to PostHog for analytics
- Non-blocking (return immediately)

### 1.9 Batch Recommendations (`/recommendations-batch`)
**Purpose**: Get recommendations for multiple check-ins
**Endpoints**:
- `POST` with `type: "first"` - Get first recommendations (replaces `/api/user/recommendation/get_all`)
- `POST` with `type: "second"` - Get second recommendations (replaces `/api/user/recommendation/second/get_all`)

**Request/Response Contracts**:
```typescript
// Request
interface BatchRecommendationsRequest {
  type: "first" | "second";
  checkins: Array<{ checkin_id: number }>;
}

// Response - Array of CardModel
interface CardModel {
  id: number;
  type: "first" | "second";
  title: string;
  insight: string;
  why: string;
  action: string;
  icon_id: number;
  order: number;
  importance: number;
  primary_color: string;
  time_create: string;
  categoryItem: any;
  isSecondType: boolean;
  parent_id: number | null;
  checkin_id: number;
  category_id: number;
  relevance: string;
  description: string;
  isChecked: boolean;
}
```

## 2. Supabase Storage Setup

### 2.1 Storage Buckets Configuration
```sql
-- Create public bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- Set up RLS policies
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 2.2 Image Migration Strategy
1. **URL Mapping**: Create mapping table for old image_id to new URLs
2. **Lazy Migration**: Migrate images on first access
3. **Batch Migration**: Background job for remaining images

### 2.3 Image Upload Edge Function (`/image-upload`)
```typescript
interface ImageUploadResponse {
  image_id: number; // For backwards compatibility
  url: string;      // New Supabase Storage URL
}
```

## 3. Authentication Testing

### 3.1 Google OAuth Setup
1. **Configure OAuth Provider**:
   ```sql
   -- Enable Google provider in Supabase Dashboard
   -- Add OAuth credentials from Google Cloud Console
   -- Configure redirect URLs for mobile app
   ```

2. **Test Deep Linking**:
   - iOS: `io.supabase.totalis://login-callback`
   - Android: `io.supabase.totalis://login-callback`

3. **Token Compatibility**:
   - Verify JWT structure matches mobile app expectations
   - Test token refresh flow
   - Ensure proper error responses for expired tokens

### 3.2 Anonymous Authentication
1. **Enable Anonymous Sign-ins**:
   ```typescript
   // Test anonymous auth flow
   const { data, error } = await supabase.auth.signInAnonymously();
   ```

2. **Account Linking**:
   - Test upgrading anonymous to Google account
   - Preserve user data during upgrade

## 4. Comprehensive Testing Suite

### 4.1 Edge Function Tests
Create test scenarios for each Edge Function:

```typescript
// Example test structure
describe('User Profile Edge Function', () => {
  test('GET returns user profile with exact structure', async () => {
    const response = await supabase.functions.invoke('user-profile');
    expect(response.data).toMatchObject({
      id: expect.any(Number),
      first_name: expect.any(String),
      // ... all required fields
    });
  });
  
  test('Handles missing Firebase UID gracefully', async () => {
    // Test migration scenarios
  });
});
```

### 4.2 Integration Tests
1. **End-to-End User Journey**:
   - Sign up → Select coach → Choose categories → Start check-in → Get recommendations
   
2. **Error Scenarios**:
   - Invalid tokens (401)
   - Server errors (500)
   - Custom errors (512)

3. **Performance Tests**:
   - Response time < 200ms for reads
   - Response time < 500ms for writes
   - Concurrent user testing

### 4.3 Mobile App Compatibility Tests
Use Postman/curl to test exact API contracts:

```bash
# Test user profile endpoint
curl -X GET \
  https://YOUR_PROJECT.supabase.co/functions/v1/user-profile \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Accept: application/json'

# Verify response matches exactly
```

## 5. Implementation Timeline

### Week 1: Core Edge Functions
- **Day 1-2**: User Profile, Categories, User Categories
- **Day 3-4**: Coaches, Chat History, Check-in History
- **Day 5**: App Config, Event Logging, Batch Recommendations

### Week 2: Storage & Authentication
- **Day 1-2**: Storage setup and image migration
- **Day 3-4**: Google OAuth and Anonymous auth
- **Day 5**: Comprehensive testing and fixes

## 6. Success Criteria

Before proceeding to mobile app changes:
1. ✅ All 9 Edge Functions return exact API contracts
2. ✅ Authentication flows work with test mobile app
3. ✅ Storage handles image upload/retrieval
4. ✅ All tests pass with 100% compatibility
5. ✅ Performance meets or exceeds current API
6. ✅ Error handling matches mobile app expectations

## 7. Risk Mitigation

1. **API Contract Validation**: Use TypeScript interfaces to ensure exact compatibility
2. **Gradual Rollout**: Test with development mobile app first
3. **Monitoring**: Add extensive logging to catch issues early
4. **Rollback Plan**: Keep track of all changes for quick reversion

---

**Next Steps**: Upon approval, I will begin implementing the Edge Functions in the order specified, ensuring each matches the exact API contracts from the mobile app.