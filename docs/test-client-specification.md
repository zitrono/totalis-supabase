# Totalis Test Client Specification

Based on mobile client analysis and clarifications, this document defines the test client requirements.

## Core Features to Test

### 1. Authentication Flow
- **Firebase Authentication**
  - Google Sign-In
  - Anonymous Sign-In
- **User Profile Creation**
  - Initial profile setup
  - Coach selection during onboarding
  - Default coach assignment (Daniel)

### 2. Chat System
- **Message Types**
  - User messages (text only, voice disregarded)
  - Assistant messages (coach responses)
  - System messages
  - PreAssistant messages (for Claude compatibility)
- **Coach Interaction**
  - Coach-specific prompts affect responses
  - Initial general check-in proposal
  - Conversational flow with AI

### 3. Check-in System
- **Triggering**
  - Type 2 recommendation cards suggest check-ins
  - User-initiated from cards or categories
  - Initial general check-in from coach
- **Question Types**
  - Checkbox (multiple choice)
  - Radio (single choice)
  - Free text explanation option
- **Flow**
  - AI dynamically determines question count
  - User can abort (loses all answers)
  - Completion generates insights and cards

### 4. Health Cards/Recommendations
- **Card Types**
  - Type 1: Action recommendations
  - Type 2: Category insights (trigger check-ins)
- **Generation**
  - Created by AI after check-in completion
  - Importance score determined by AI
  - 196-hour shelf life (not critical for testing)
- **Management**
  - Cards can be marked as checked
  - Tied to specific categories
  - Local caching with expiration

### 5. Categories System
- **Structure**
  - Hierarchical (parent/subcategories)
  - Progress tracking (0-100%)
  - Color coding and icons
- **Features**
  - Favorites marking
  - Shortcuts for quick access
  - Progress calculated by AI after check-ins

### 6. Data Models to Test

#### User Profile
```typescript
{
  id: string;
  email?: string;
  name: string;
  dateOfBirth: Date;
  sex: 'male' | 'female' | 'other';
  coachId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Message
```typescript
{
  id: string;
  userId: string;
  coachId: string;
  role: 'user' | 'assistant' | 'system' | 'preassistant';
  content: string;
  answerOptions?: {
    type: 'checkbox' | 'radio';
    options: string[];
  };
  createdAt: Date;
}
```

#### Check-in
```typescript
{
  id: string;
  userId: string;
  categoryId?: string;
  questions: Array<{
    question: string;
    type: 'checkbox' | 'radio';
    options: string[];
    answer: string | string[];
    explanation?: string;
  }>;
  completed: boolean;
  insight?: string;
  summary?: string;
  level?: number;
  createdAt: Date;
}
```

#### Health Card
```typescript
{
  id: string;
  userId: string;
  categoryId: string;
  checkInId: string;
  type: 1 | 2; // 1: action, 2: insight
  title: string;
  content: string;
  importance: number;
  checked: boolean;
  expiresAt: Date;
  createdAt: Date;
}
```

## Test Scenarios

### 1. New User Flow
1. Anonymous authentication
2. Profile creation
3. Coach selection
4. Initial coach greeting
5. General check-in proposal
6. Complete check-in
7. Receive health cards

### 2. Returning User Flow
1. Sign in (Google/Anonymous)
2. Load existing profile
3. Resume conversations
4. Browse existing cards
5. Initiate category-specific check-in

### 3. Check-in Flows
1. Complete full check-in
2. Abort check-in mid-way
3. Various answer combinations
4. Free text explanations

### 4. Category Navigation
1. Browse all categories
2. Mark favorites
3. View category progress
4. Trigger check-in from category

### 5. Card Management
1. View active cards
2. Mark cards as checked
3. Filter by category
4. Handle card expiration

## Implementation Notes

### API Communication
- Use existing Request class pattern
- Firebase ID token authentication
- Handle token refresh
- Retry on network failures

### State Management
- Maintain user session
- Cache categories and cards
- Track check-in progress
- Handle coach context

### Error Handling
- Network failure retries
- Graceful degradation
- User-friendly error messages

### Testing Approach
- Unit tests for data models
- Integration tests for API calls
- End-to-end tests for user flows
- State persistence tests

## Non-Functional Requirements

### Performance
- Async operations for API calls
- Efficient data caching
- Minimal latency simulation

### Data Integrity
- Maintain relationships between entities
- Validate data before submission
- Handle concurrent operations

### Flexibility
- Easy to add new test scenarios
- Configurable test data
- Extensible architecture

## Out of Scope
- Voice recording/processing
- Audio message handling
- Real-time features
- Push notifications
- Offline mode complexities