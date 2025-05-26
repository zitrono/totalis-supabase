# Phase 6: Mobile App Migration Proposal

## Overview
This proposal outlines the migration strategy for the Totalis Flutter mobile app from Firebase/Legacy API to Supabase, following the requirements:
- No backwards compatibility required
- Extensive code comments on new SDK and Supabase functionality
- Old API code to be commented out (not deleted)

## Current State Analysis

### Architecture
- **Flutter App**: Well-structured with clear separation of concerns
- **State Management**: Provider pattern with ChangeNotifier
- **Authentication**: Firebase Auth (Google Sign-In + Anonymous)
- **API Communication**: Custom Dio-based HTTP client
- **Backend**: Legacy Python FastAPI at api.totalis.ai

### Dependencies to Replace
```yaml
# Current Firebase dependencies
firebase_core: ^1.13.1
firebase_auth: ^3.3.9
firebase_analytics: ^9.1.2
cloud_firestore: ^3.1.10

# To be replaced with
supabase_flutter: ^2.5.0
```

## Migration Strategy

### Phase 6.1: Core Infrastructure Setup (2 days)

#### 1. Add Supabase SDK
```dart
// pubspec.yaml
dependencies:
  supabase_flutter: ^2.5.0
  # Keep existing dependencies, comment out Firebase later
```

#### 2. Initialize Supabase
```dart
// lib/main.dart
// TODO: Replace Firebase initialization with Supabase
// Extensive comments explaining Supabase initialization
await Supabase.initialize(
  url: 'YOUR_SUPABASE_URL',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
  authOptions: AuthClientOptions(
    autoRefreshToken: true,
    persistSession: true,
  ),
);
```

#### 3. Update Configuration
```dart
// lib/api/app_config.dart
class AppConfig {
  // DEPRECATED: Old API endpoints - DO NOT DELETE
  // static const String prodDomain = "https://api.totalis.ai/";
  
  // NEW: Supabase Edge Functions base URL
  // Edge Functions provide serverless API endpoints
  static const String supabaseUrl = "YOUR_SUPABASE_URL";
  static const String supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";
}
```

### Phase 6.2: Authentication Migration (3 days)

#### 1. Replace Firebase Auth Service
```dart
// lib/services/auth_service.dart
class SupabaseAuthService {
  // Supabase Auth provides JWT-based authentication
  // Compatible with Google OAuth and anonymous sign-in
  
  Future<AuthResponse> signInWithGoogle() async {
    // NEW: Supabase Google OAuth flow
    // Returns JWT token automatically managed by SDK
    final response = await supabase.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: 'io.supabase.totalis://login-callback',
    );
  }
  
  Future<AuthResponse> signInAnonymously() async {
    // NEW: Supabase anonymous authentication
    // Creates temporary user session
    final response = await supabase.auth.signInAnonymously();
  }
}
```

#### 2. Update Token Management
```dart
// lib/api/request.dart
class Request {
  // DEPRECATED: Firebase token management
  // String? _firebaseToken = await FirebaseAuth.instance.currentUser?.getIdToken();
  
  // NEW: Supabase automatically handles JWT tokens
  // No manual token management required
  Future<String?> _getSupabaseToken() async {
    final session = supabase.auth.currentSession;
    return session?.accessToken;
  }
}
```

### Phase 6.3: API Layer Migration (5 days)

#### 1. Create Supabase API Client
```dart
// lib/api/supabase_client.dart
class SupabaseApiClient {
  // Centralized client for all Supabase Edge Function calls
  // Handles authentication, error handling, and response parsing
  
  Future<T?> invokeFunction<T>(
    String functionName,
    Map<String, dynamic> body,
  ) async {
    // Edge Functions are Deno-based serverless functions
    // Automatically include auth headers from Supabase client
    final response = await supabase.functions.invoke(
      functionName,
      body: body,
    );
    
    // Handle Supabase-specific error responses
    if (response.error != null) {
      throw SupabaseException(response.error!);
    }
    
    return response.data as T?;
  }
}
```

#### 2. Migrate Each API Endpoint
```dart
// Example: lib/api/user/user_api.dart
class UserApi {
  // DEPRECATED: Legacy API calls - DO NOT DELETE
  // Future<UserProfileDto?> getUserProfile() async {
  //   final response = await Request().get('/api/user/account/parameters');
  //   return UserProfileDto.fromJson(response);
  // }
  
  // NEW: Supabase Edge Function call
  // Edge Function 'user-profile' handles user data
  Future<UserProfileDto?> getUserProfile() async {
    final response = await SupabaseApiClient().invokeFunction(
      'user-profile',
      {'action': 'get'},
    );
    return UserProfileDto.fromJson(response);
  }
}
```

### Phase 6.4: New Edge Functions Implementation (5 days)

Create the missing Edge Functions identified in the analysis:

#### 1. User Profile Management
```typescript
// supabase/functions/user-profile/index.ts
// Handles user profile CRUD operations
// Replaces: /api/user/account/parameters, /api/user/account/change_parameters
```

#### 2. Categories Management
```typescript
// supabase/functions/categories/index.ts
// Manages wellness categories
// Replaces: /api/user/category/get
```

#### 3. User Categories (Favorites)
```typescript
// supabase/functions/user-categories/index.ts
// Manages user's selected categories
// Replaces: /api/user/user_category/*
```

#### 4. Coaches
```typescript
// supabase/functions/coaches/index.ts
// Coach selection and management
// Replaces: /api/user/coach/*
```

#### 5. Chat History
```typescript
// supabase/functions/chat-history/index.ts
// Retrieves conversation history
// Replaces: /api/user/chat/get_messages
```

#### 6. Check-in History
```typescript
// supabase/functions/checkin-history/index.ts
// Historical check-in data and analytics
// Replaces: /api/user/checkin/get/*
```

#### 7. App Configuration
```typescript
// supabase/functions/app-config/index.ts
// Dynamic app configuration
// Replaces: /api/user/variable/*
```

#### 8. Event Logging
```typescript
// supabase/functions/log-event/index.ts
// Analytics and event tracking
// Replaces: /api/log_event
```

### Phase 6.5: Storage Migration (2 days)

#### 1. Replace Image API with Supabase Storage
```dart
// lib/services/storage_service.dart
class SupabaseStorageService {
  // Supabase Storage provides S3-compatible object storage
  // Automatic image optimization and CDN delivery
  
  Future<String> uploadImage(File image) async {
    // NEW: Direct upload to Supabase Storage
    final fileName = 'user_images/${uuid.v4()}.jpg';
    final response = await supabase.storage
        .from('images')
        .upload(fileName, image);
    
    // Get public URL for the uploaded image
    final publicUrl = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
    
    return publicUrl;
  }
}
```

### Phase 6.6: Testing & Validation (3 days)

1. **Unit Tests**: Update all API-related tests
2. **Integration Tests**: Test Supabase authentication flow
3. **End-to-End Tests**: Full user journey testing
4. **Performance Testing**: Ensure no regression

## Implementation Order (Backend-First Approach)

### Stage 1: Backend Preparation (Week 1-2)
1. **Missing Edge Functions Implementation**
   - Create all 9 missing Edge Functions
   - Match exact API contracts from mobile app
   - Comprehensive test scenarios for each function

2. **Storage Setup**
   - Configure Supabase Storage buckets
   - Set up image upload/retrieval policies
   - Test image migration from old system

3. **Authentication Testing**
   - Verify Google OAuth flow with Supabase
   - Test anonymous authentication
   - Ensure JWT token compatibility

4. **Backend Validation**
   - Test all Edge Functions with Postman/curl
   - Verify response formats match mobile app expectations
   - Performance testing and optimization

### Stage 2: Mobile App Migration (Week 3)
1. **Only after all backend is ready and tested**
   - Add Supabase SDK to Flutter app
   - Update authentication layer
   - Migrate API calls with extensive comments
   - Keep old code commented out

### Benefits of Backend-First Approach
- **Risk Reduction**: Test everything before touching mobile app
- **Parallel Development**: Backend can be built while app continues working
- **Easy Rollback**: If issues arise, mobile app unchanged
- **Better Testing**: Can validate all endpoints independently
- **Confidence**: Know backend works before migration

## Benefits of This Approach

1. **Clean Migration**: Old code commented out, easy to reference
2. **Type Safety**: Maintain existing DTOs and models
3. **Minimal UI Changes**: API layer changes transparent to UI
4. **Better Performance**: Edge Functions closer to data
5. **Real-time Ready**: Can add real-time features later
6. **Unified Auth**: Single auth system across web and mobile

## Risk Mitigation

1. **Gradual Migration**: Can test endpoint by endpoint
2. **Fallback Option**: Old code still available (commented)
3. **Extensive Comments**: Every Supabase feature documented
4. **Testing First**: Edge Functions tested before mobile changes

## Next Steps

Upon approval, I will:
1. Implement all missing Edge Functions
2. Create detailed migration guide for each API endpoint
3. Set up Supabase SDK in the mobile app
4. Migrate authentication system
5. Update all API calls with extensive comments

Please review and approve this implementation plan.