# Supabase Test Client Specification

## Overview

A server-based test client that validates the Supabase backend implementation against expected functionality before mobile app migration. This ensures API compatibility and feature completeness.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Test Client (Node.js)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Test Suite │  │   Test Data  │  │   Reporters  │  │
│  │   Runner    │  │   Fixtures   │  │ • Console    │  │
│  │ • Jest/Mocha│  │ • Users      │  │ • HTML       │  │
│  │ • Parallel  │  │ • Categories │  │ • JSON       │  │
│  └──────┬──────┘  └──────────────┘  └──────────────┘  │
└─────────┼───────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase Client SDK                         │
│         (Same SDK as mobile app will use)                │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase Backend                        │
│     (Database, Auth, Realtime, Edge Functions)           │
└─────────────────────────────────────────────────────────┘
```

## Test Categories

### 1. Authentication Tests
```typescript
describe('Authentication', () => {
  test('Should sign up with Google OAuth', async () => {
    // Test OAuth flow simulation
  });
  
  test('Should create anonymous session', async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    expect(error).toBeNull();
    expect(data.session).toBeDefined();
  });
  
  test('Should upgrade anonymous to Google account', async () => {
    // Test account linking
  });
});
```

### 2. User Profile Tests
```typescript
describe('User Profiles', () => {
  test('Should create user profile on first auth', async () => {
    // Test auto-profile creation
  });
  
  test('Should update user profile', async () => {
    const updates = {
      year_of_birth: 1990,
      coach_id: 'uuid-here'
    };
    // Test profile updates
  });
  
  test('Should enforce RLS policies', async () => {
    // Test user can only see own profile
  });
});
```

### 3. Category Tests
```typescript
describe('Categories', () => {
  test('Should fetch all categories', async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');
    
    expect(data.length).toBeGreaterThan(0);
    // Verify hierarchy structure
  });
  
  test('Should maintain parent-child relationships', async () => {
    // Test category hierarchy
  });
});
```

### 4. Messaging Tests
```typescript
describe('Messaging', () => {
  test('Should send text message', async () => {
    const message = {
      content: 'Test message',
      role: 'user',
      content_type: 'text'
    };
    // Test message creation
  });
  
  test('Should receive real-time updates', async () => {
    // Subscribe to messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => {
          // Verify real-time update
        }
      )
      .subscribe();
  });
  
  test('Should handle voice messages', async () => {
    // Test voice transcription edge function
  });
});
```

### 5. Check-in Tests
```typescript
describe('Check-ins', () => {
  test('Should start check-in', async () => {
    const checkin = {
      category_id: 'uuid',
      content: 'Starting check-in',
      content_type: 'checkin',
      metadata: { type: 'start' }
    };
    // Test check-in flow
  });
  
  test('Should complete check-in with summary', async () => {
    // Test brief, summary, insight generation
  });
  
  test('Should track mood data', async () => {
    // Test mood metadata storage
  });
});
```

### 6. Voice Feature Tests
```typescript
describe('Voice Features', () => {
  test('Should transcribe audio', async () => {
    const audioBase64 = 'mock-audio-data';
    const { data } = await supabase.functions.invoke('voice-transcribe', {
      body: { audio_base64: audioBase64 }
    });
    expect(data.text).toBeDefined();
  });
  
  test('Should generate speech', async () => {
    const { data } = await supabase.functions.invoke('text-to-speech', {
      body: { text: 'Hello world', voice: 'alloy' }
    });
    expect(data.audio_url).toBeDefined();
  });
});
```

### 7. Recommendation Tests
```typescript
describe('Recommendations', () => {
  test('Should create first-level recommendations', async () => {
    // Test after check-in completion
  });
  
  test('Should create second-level recommendations', async () => {
    // Test linked recommendations
  });
  
  test('Should fetch recommendations by type', async () => {
    const { data } = await supabase
      .from('recommendations')
      .select('*')
      .eq('recommendation_type', 'how');
  });
});
```

### 8. Feedback Tests
```typescript
describe('Feedback', () => {
  test('Should submit user feedback', async () => {
    const { error } = await supabase.functions.invoke('process-feedback', {
      body: { feedback_text: 'Great app!' }
    });
    expect(error).toBeNull();
  });
});
```

### 9. Integration Tests
```typescript
describe('Integration', () => {
  test('Should complete full check-in flow', async () => {
    // Test complete user journey
  });
  
  test('Should handle offline/online sync', async () => {
    // Test offline capabilities
  });
});
```

### 10. Edge Cases & Error Handling
```typescript
describe('Error Handling', () => {
  test('Should handle network failures gracefully', async () => {
    // Test retry logic
  });
  
  test('Should validate data before insertion', async () => {
    // Test data validation
  });
  
  test('Should handle rate limiting', async () => {
    // Test rate limit responses
  });
});
```

## Test Data Management

### Fixtures
```typescript
// fixtures/users.ts
export const testUsers = [
  {
    email: 'test1@example.com',
    profile: { year_of_birth: 1990, coach_id: 'coach-1' }
  },
  {
    email: 'test2@example.com',
    profile: { year_of_birth: 1985, coach_id: 'coach-2' }
  }
];

// fixtures/categories.ts
export const testCategories = [
  {
    name: 'Wellness',
    name_short: 'Well',
    sort_order: 1,
    children: [
      { name: 'Mental Health', parent_id: null },
      { name: 'Physical Health', parent_id: null }
    ]
  }
];
```

### Database Seeding
```typescript
async function seedDatabase() {
  // Clear test data
  await clearTestData();
  
  // Insert coaches
  await supabase.from('coaches').insert(testCoaches);
  
  // Insert categories
  await supabase.from('categories').insert(testCategories);
  
  // Create test users
  for (const user of testUsers) {
    await createTestUser(user);
  }
}
```

## Implementation Details

### Test Environment Setup
```typescript
// setup.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Setup test isolation
beforeEach(async () => {
  await setupTestEnvironment();
});

afterEach(async () => {
  await cleanupTestEnvironment();
});
```

### Continuous Integration
```yaml
# .github/workflows/test.yml
name: Backend Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:setup  # Setup Supabase locally
      - run: npm test
      - run: npm run test:teardown
```

### Test Reports
```typescript
// Generate comprehensive test report
export function generateTestReport(results: TestResults) {
  return {
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped
    },
    coverage: {
      endpoints: calculateEndpointCoverage(),
      features: calculateFeatureCoverage(),
      edgeCases: calculateEdgeCaseCoverage()
    },
    timing: {
      totalDuration: results.totalDuration,
      avgTestTime: results.avgTestTime
    }
  };
}
```

## Benefits

1. **Early Validation**: Catch issues before mobile development
2. **API Contract**: Ensures backend matches expected interface
3. **Regression Testing**: Prevent breaking changes
4. **Documentation**: Tests serve as API documentation
5. **Confidence**: Ensure all features work before migration

## Timeline

1. **Week 1**: Setup test framework and basic auth tests
2. **Week 2**: Core functionality tests (categories, messages)
3. **Week 3**: Advanced features (voice, recommendations)
4. **Week 4**: Performance and edge case testing
5. **Ongoing**: Run tests on every backend change

---

*Document created: May 24, 2025*
*Purpose: Test client specification for Supabase backend validation*