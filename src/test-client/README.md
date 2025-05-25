# Totalis Test Client

A comprehensive test client for validating the Totalis Supabase migration. This client simulates mobile app interactions to ensure the new backend behaves correctly.

## Features

- **Authentication Testing**: Anonymous and Google sign-in simulation
- **User Profile Management**: Profile creation and coach selection
- **Chat Interactions**: AI coach conversations with message history
- **Check-in System**: Dynamic health assessments with various question types
- **Health Cards**: Generation, retrieval, and management of recommendations
- **Category System**: Navigation, favorites, and progress tracking

## Usage

### Run All Test Scenarios
```bash
npm run test:scenarios
```

### Run Individual Scenarios
```bash
npm run test:new-user      # Test new user onboarding flow
npm run test:client chat   # Test chat interactions
npm run test:client category-checkin  # Test category-specific check-ins
npm run test:client abort-checkin     # Test check-in abortion
```

### Interactive Mode
```bash
npm run test:interactive
```

Interactive mode provides a REPL-like interface for manual testing:
- `auth` - Sign in anonymously
- `profile` - Create/get user profile
- `chat <message>` - Send a chat message
- `checkin` - Start a check-in
- `cards` - Get active cards
- `categories` - List all categories
- `exit` - Exit interactive mode

## Architecture

### Core Services

1. **AuthService**: Handles authentication flows
2. **UserService**: Manages user profiles
3. **ChatService**: Handles messaging and AI interactions
4. **CheckInService**: Manages health assessments
5. **CardService**: Handles health recommendations
6. **CategoryService**: Manages health categories and coaches

### Test Scenarios

1. **New User Scenario**
   - Anonymous sign-in
   - Profile creation
   - Coach selection
   - Initial check-in
   - Card generation

2. **Chat Interaction Scenario**
   - Message sending
   - AI responses
   - Answer options handling
   - Conversation history

3. **Category Check-in Scenario**
   - Category browsing
   - Progress tracking
   - Category-specific assessments
   - Card management

4. **Abort Check-in Scenario**
   - Partial check-in completion
   - Abortion handling
   - Data loss verification
   - Recovery testing

## Key Behaviors

### Check-in System
- AI dynamically generates 3-10 questions
- Questions can be radio (single choice) or checkbox (multiple choice)
- Users can add free text explanations
- Aborting loses all progress
- Completion generates health cards

### Health Cards
- Type 1: Action recommendations
- Type 2: Category insights (can trigger check-ins)
- 196-hour shelf life (configurable)
- Importance scoring by AI
- Can be marked as checked

### Coach System
- Default coach: Daniel
- Each coach has unique prompts
- Coach context affects AI responses
- Anonymous users get full access

## Development

### Adding New Scenarios

1. Create a new file in `scenarios/`:
```typescript
export async function runMyScenario(client: TotalisTestClient) {
  // Your test logic
}
```

2. Export from `scenarios/index.ts`

3. Add CLI command in `cli.ts`

### Extending Services

Services are modular and can be extended:
```typescript
class MyExtendedService extends TestBaseService {
  async customMethod() {
    // Your implementation
  }
}
```

## Notes

- Voice recording functionality is not implemented (as requested)
- Timestamps can be approximated for testing
- No rate limiting or throttling simulation
- Focus is on functional validation, not performance testing