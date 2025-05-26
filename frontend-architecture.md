# Totalis Mobile Frontend Architecture Report

## Executive Summary

Totalis Mobile is a Flutter-based cross-platform mobile application that serves as the primary client for the Totalis wellness and coaching platform. The app features a sophisticated multi-provider state management architecture, Firebase authentication integration, and real-time AI-powered chat functionality. The application is designed to work seamlessly with the FastAPI backend, providing users with personalized wellness coaching experiences.

## Technology Stack

### Core Technologies
- **Framework**: Flutter 3.0.6+ with Dart SDK
- **State Management**: Provider pattern with ChangeNotifier
- **Authentication**: Firebase Auth
- **Networking**: Dio HTTP client
- **Local Storage**: SharedPreferences
- **Reactive Programming**: RxDart for stream management
- **Platform Support**: iOS, Android, Web, macOS, Windows, Linux

### Key Dependencies
```yaml
- flutter_localizations: Multi-language support
- json_annotation: JSON serialization
- flutter_svg: SVG rendering
- rxdart: Reactive extensions
- provider: State management
- dio: HTTP networking
- firebase_auth: Authentication
- cloud_firestore: Firestore integration
- cached_network_image: Image caching
- carousel_slider: Image carousels
- flutter_slidable: Swipeable list items
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Flutter Application                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Screens   │  │   Widgets    │  │  Navigation  │  │
│  │ • Auth      │  │ • Reusable   │  │ • Routes     │  │
│  │ • Home      │  │ • Custom     │  │ • Deep Links │  │
│  │ • Chat      │  │ • Shared     │  │              │  │
│  │ • Profile   │  │              │  │              │  │
│  └──────┬──────┘  └──────────────┘  └──────────────┘  │
└─────────┼───────────────────────────────────────────────┘
          │
┌─────────┼───────────────────────────────────────────────┐
│         │         State Management Layer                 │
│  ┌──────┴──────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Providers  │  │    BLoCs     │  │  Controllers │  │
│  │ • User      │  │ • Chat       │  │ • Category   │  │
│  │ • Category  │  │ • Summary    │  │ • Tab        │  │
│  │ • Checklist │  │ • Browse     │  │              │  │
│  └──────┬──────┘  └──────────────┘  └──────────────┘  │
└─────────┼───────────────────────────────────────────────┘
          │
┌─────────┼───────────────────────────────────────────────┐
│         │            Service Layer                       │
│  ┌──────┴──────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Backend   │  │     API      │  │    Cache     │  │
│  │   Service   │  │   Requests   │  │   Service    │  │
│  │ • API Config│  │ • User       │  │ • Proposals  │  │
│  │ • Auth      │  │ • Messages   │  │ • Categories │  │
│  │             │  │ • Categories │  │              │  │
│  └──────┬──────┘  └──────────────┘  └──────────────┘  │
└─────────┼───────────────────────────────────────────────┘
          │
┌─────────┴───────────────────────────────────────────────┐
│              External Services                           │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────┐  │
│  │  Firebase  │  │   Totalis  │  │  SharedPrefs    │  │
│  │    Auth    │  │  Backend   │  │  Local Storage  │  │
│  │            │  │   API      │  │                 │  │
│  └────────────┘  └────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Data Models

### User Management
```dart
class UserModel {
  int? id;
  String? first_name;
  String? last_name;
  String? firebase_uid;      // Firebase authentication ID
  bool? is_tester;
  SexEnum? sex;              // M, F, N
  String? birth;
  int? coach_id;             // Assigned AI coach
  int? image_id;
  bool? is_anonymous;
  String? summarization;     // AI-generated user summary
  int? summarization_count;
  String? time_create;
}
```

### Category System
```dart
class CategoryModel {
  int? id;
  int? parent_id;            // Hierarchical categories
  String? name;
  String? name_short;
  int? icon_id;
  int? sort_order;
  String? description;
  bool? show_checkin_history;
  bool? checkin_enabled;
  bool? followup_chat_enabled;
  int? followup_timer;
  String? primary_color;     // UI customization
  String? secondary_color;
  int? max_questions;
}
```

### Messaging
```dart
class MessageModel {
  int? id;
  bool? is_checkin;
  int? checkin_id;
  int? coach_id;
  String? text;
  MessageRole? role;         // User, Assistant, System, PreAssistant
  int? tokens_used;
  String? gpt_version;
  AnswerModel? answers;      // Structured responses
  String? raw_gpt_message;
  bool? checkin_end;
  String? time_create;
}
```

### Check-ins
```dart
class CheckInModel {
  int? id;
  int? category_id;
  String? initial_message;
  String? summary;
  Map<String, dynamic>? mood;
  String? time_create;
}
```

## State Management Architecture

### Provider Pattern Implementation

The app uses a nested provider architecture with the following hierarchy:

```dart
App
├── LanguageService (ChangeNotifierProvider)
├── CategoryController (ChangeNotifierProvider)
├── UserController (ChangeNotifierProvider)
├── ChecklistService (ChangeNotifierProvider)
├── CategoriesListService (ChangeNotifierProvider)
└── CardsService (ChangeNotifierProvider)
```

### BLoC Pattern for Complex Features

```dart
abstract class BlocBase<T> {
  Stream<T> get stream;
  void dispose();
}

class ChatBloc extends BlocBaseWithState<ScreenState> {
  // Message management
  // Real-time updates
  // Coach interactions
}
```

### State Flow Example

1. **User Action**: User sends a chat message
2. **BLoC Processing**: ChatBloc handles the message
3. **API Call**: MessageRequest sends to backend
4. **State Update**: BLoC updates ScreenState
5. **UI Rebuild**: StreamBuilder triggers UI update

## API Integration

### HTTP Client Configuration

```dart
class Request {
  static Dio? dio;
  static String? token;  // Firebase ID token
  
  // Base configuration
  static final BaseOptions = BaseOptions(
    baseUrl: 'https://api.totalis.ai/',
    responseType: ResponseType.json,
    headers: {
      'Accept': 'application/json',
      'Authorization': token,
      'Content-Type': 'application/json',
    }
  );
}
```

### Authentication Flow

```
1. User launches app
2. Check SharedPreferences for saved token
3. If no token, redirect to Firebase Auth
4. Obtain Firebase ID token
5. Store token in SharedPreferences
6. Include token in all API requests
7. Handle 401 responses with token refresh
```

### API Endpoints Mapping

| Feature | Endpoint | Method | Purpose |
|---------|----------|---------|---------|
| User Profile | `/api/user/account/` | GET/POST | User data management |
| Categories | `/api/user/category/` | GET | Fetch category hierarchy |
| Messages | `/api/user/message/` | GET/POST | Chat functionality |
| Check-ins | `/api/user/checkin/` | GET/POST | Wellness check-ins |
| Coaches | `/api/user/coach/` | GET | AI coach information |
| Proposals | `/api/user/proposal/` | GET | AI-generated suggestions |

## Navigation & Routing

### Route Structure

```dart
routes: {
  '/': (context) => const SplashPage(),      // Initial loading
  '/auth': (context) => const AuthPage(),    // Authentication flow
  '/home': (context) => const NavigationBarPage(), // Main app
}
```

### Navigation Flow

```
SplashPage
├── Check Authentication
├── Load Initial Data
└── Navigate to:
    ├── AuthPage (if not authenticated)
    └── NavigationBarPage (if authenticated)
        ├── HomePage
        ├── CategoriesListPage
        ├── ChatPage
        └── ProfilePage
```

## UI/UX Architecture

### Design System

```dart
class BC { // Brand Colors
  static Color white = const Color(0xFFFFFFFF);
  static Color background = const Color(0xFFF5F5F5);
  static Color primary = const Color(0xFF6366F1);
  // ...
}

class BS { // Brand Styles
  static TextStyle reg16 = TextStyle(...);
  static TextStyle bold20 = TextStyle(...);
  // ...
}
```

### Component Architecture

1. **Screens**: Full-page components
2. **Widgets**: Reusable UI components
3. **Pages**: Sub-screens within main screens
4. **BLoCs**: Business logic for screens

### Responsive Design

- Uses `MediaQuery` for responsive layouts
- Adaptive components for different screen sizes
- Platform-specific UI elements (Cupertino/Material)

## Performance Optimizations

### Current Optimizations

1. **Image Caching**: `cached_network_image` for efficient image loading
2. **Lazy Loading**: List views with pagination
3. **Stream Management**: Proper disposal of streams and controllers
4. **Widget Keys**: Efficient widget tree rebuilding
5. **Skeleton Loading**: Visual feedback during data fetching

### Memory Management

```dart
// Proper disposal pattern
@override
void dispose() {
  scrollController?.dispose();
  streamController?.close();
  super.dispose();
}
```

## Offline Capabilities

### Local Storage Strategy

1. **SharedPreferences**: User settings, tokens, language
2. **Cache Service**: Temporary data caching
3. **Firebase Offline**: Firestore offline persistence

### Data Synchronization

```dart
class Cache {
  // Proposal caching
  Future<void> addProposal(ProposalModel proposal);
  Future<List<ProposalModel>?> getProposals();
  
  // Category caching
  Future<void> cacheCategories(List<CategoryModel> categories);
}
```

## Security Considerations

### Current Implementation

1. **Firebase Authentication**: Secure user authentication
2. **Token Management**: Automatic token refresh
3. **HTTPS Only**: All API communications encrypted
4. **Input Validation**: Client-side validation before API calls

### Recommended Improvements

1. **Certificate Pinning**: Prevent MITM attacks
2. **Biometric Authentication**: Add fingerprint/Face ID
3. **Data Encryption**: Encrypt sensitive local storage
4. **Code Obfuscation**: Protect against reverse engineering

## Testing Strategy

### Unit Testing
- Model serialization/deserialization
- Business logic in BLoCs
- Utility functions

### Widget Testing
- Individual widget behavior
- Screen state management
- User interaction flows

### Integration Testing
- End-to-end user flows
- API integration
- Authentication flow

## Development Workflow

### Project Structure
```
totalis-mobile/
├── lib/
│   ├── api/            # API models and requests
│   ├── controllers/    # State controllers
│   ├── generated/      # Generated code (l10n, assets)
│   ├── l10n/          # Localization files
│   ├── routers/       # Navigation logic
│   ├── screens/       # UI screens
│   ├── utils/         # Utilities and helpers
│   ├── widgets/       # Reusable widgets
│   └── main.dart      # App entry point
├── assets/            # Images, fonts, etc.
├── android/           # Android-specific code
├── ios/              # iOS-specific code
├── web/              # Web-specific code
└── pubspec.yaml      # Dependencies
```

### Build & Deployment

```bash
# Development
flutter run

# Build for production
flutter build ios --release
flutter build apk --release
flutter build web --release
```

## Multi-language Support

### Localization Architecture

```dart
// Supported locales
supportedLocales: S.delegate.supportedLocales,

// Localization delegates
localizationsDelegates: const [
  S.delegate,
  GlobalMaterialLocalizations.delegate,
  GlobalWidgetsLocalizations.delegate,
  GlobalCupertinoLocalizations.delegate,
]
```

### Language Switching

1. User selects language in settings
2. LanguageService updates locale
3. App rebuilds with new translations
4. Preference saved locally

## AI Integration Features

### Coach System
- Multiple AI coaches with personalities
- Coach selection during onboarding
- Coach-specific prompts and responses

### Chat Features
- Real-time AI responses
- Context-aware conversations
- Structured response options (Yes/No, Radio, Checkbox)
- Check-in flows with guided questions

### Recommendations
- AI-generated category suggestions
- Personalized wellness tips
- Follow-up chat scheduling

## Future Enhancements

### Technical Roadmap

1. **State Management Migration**: Consider Riverpod or Bloc
2. **GraphQL Integration**: Replace REST with GraphQL
3. **WebSocket Support**: Real-time message updates
4. **Offline-First Architecture**: Complete offline functionality
5. **Performance Monitoring**: Integration with Firebase Performance

### Feature Roadmap

1. **Push Notifications**: Reminders and updates
2. **Voice Integration**: Voice messages and commands
3. **Wearable Support**: Apple Watch, Wear OS
4. **Social Features**: Community support
5. **Analytics Dashboard**: Personal progress tracking

## Conclusion

The Totalis mobile application demonstrates a well-structured Flutter implementation with strong foundations for scalability and maintainability. The multi-provider state management pattern, combined with BLoC for complex features, provides a flexible architecture. The deep integration with Firebase services and the Totalis backend API creates a seamless user experience for wellness coaching and personal development.

Key strengths include:
- Clean separation of concerns
- Comprehensive state management
- Robust error handling
- Multi-platform support
- Strong typing with Dart

Areas for potential improvement:
- Enhanced offline capabilities
- More sophisticated caching strategies
- Performance optimizations for large data sets
- Additional security measures

---

*Generated: May 24, 2025*
*Repository: github.com/zitrono/totalis-mobile*
*Platform: Flutter 3.0.6+ with Dart SDK*