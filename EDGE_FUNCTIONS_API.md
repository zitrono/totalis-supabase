# Totalis Edge Functions API Documentation

## Overview
This document describes the Edge Functions API for Totalis. These functions handle complex business logic that requires server-side processing, AI integration via Langflow, and multi-table transactions.

**Base URL**: `https://[your-project-id].supabase.co/functions/v1`

## Authentication
All Edge Functions require Supabase authentication. Include the user's JWT token in the Authorization header:

```
Authorization: Bearer <supabase-jwt-token>
```

## Endpoints

### 1. Langflow Webhook
**Purpose**: Receives callbacks from Langflow AI processing

**Endpoint**: `POST /langflow-webhook`

**Headers**:
- `Content-Type: application/json`

**Request Body**:
```json
{
  "any": "Langflow payload data"
}
```

**Response**:
```json
{
  "received": true,
  "timestamp": "2025-05-25T10:00:00Z",
  "echo": { /* echoed payload */ },
  "message": "Webhook received successfully"
}
```

---

### 2. Get Recommendations
**Purpose**: Generate personalized recommendations for the user

**Endpoint**: `POST /recommendations`

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "count": 3,           // Optional, default: 3
  "categoryId": "uuid"  // Optional, to prioritize specific category
}
```

**Response**:
```json
{
  "recommendations": [
    {
      "id": "uuid",
      "userId": "uuid",
      "title": "Practice Mindful Breathing",
      "insight": "Your recent check-ins show elevated stress levels",
      "why": "Breathing exercises can help reduce stress",
      "action": "Take 5 minutes to practice the 4-7-8 technique",
      "categoryId": "uuid",
      "importance": 9,
      "relevance": "Based on your recent Stress Management check-in",
      "createdAt": "2025-05-25T10:00:00Z"
    }
  ],
  "context": {
    "coachId": "uuid",
    "categoriesConsidered": ["uuid1", "uuid2", "uuid3"]
  }
}
```

---

### 3. Start Check-in
**Purpose**: Initialize a new check-in session

**Endpoint**: `POST /checkin-start`

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "categoryId": "uuid"  // Required
}
```

**Response**:
```json
{
  "checkIn": {
    "id": "uuid",
    "userId": "uuid",
    "categoryId": "uuid",
    "status": "in_progress",
    "startedAt": "2025-05-25T10:00:00Z"
  },
  "category": {
    "id": "uuid",
    "name": "Stress Management",
    "maxQuestions": 3
  },
  "questions": [
    "How are you feeling about Stress Management right now?",
    "What specific aspect would you like to focus on?",
    "On a scale of 1-10, how would you rate your current stress?"
  ],
  "message": "Check-in started successfully"
}
```

**Error Responses**:
- `409 Conflict`: User already has an active check-in
- `404 Not Found`: Invalid category ID

---

### 4. Process Check-in Response
**Purpose**: Submit answer and get next question or complete check-in

**Endpoint**: `POST /checkin-process`

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "checkInId": "uuid",      // Required
  "question": "string",     // Required
  "answer": "string",       // Required
  "isComplete": false       // Optional, set true to complete
}
```

**Response (Continuing)**:
```json
{
  "checkInId": "uuid",
  "response": {
    "questionId": "uuid",
    "question": "How are you feeling?",
    "answer": "Stressed but managing",
    "timestamp": "2025-05-25T10:00:00Z"
  },
  "totalResponses": 2,
  "nextQuestion": "What specific situation is contributing?",
  "status": "in_progress"
}
```

**Response (Completed)**:
```json
{
  "checkInId": "uuid",
  "response": { /* ... */ },
  "totalResponses": 3,
  "status": "completed",
  "message": "Check-in completed successfully!",
  "recommendations": [
    { /* 2 relevant recommendations */ }
  ]
}
```

---

### 5. Get AI Chat Response
**Purpose**: Get supportive AI response in chat context

**Endpoint**: `POST /chat-ai-response`

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "message": "I'm feeling overwhelmed",  // Required
  "contextType": "category",             // Optional: category/checkin/recommendation
  "contextId": "uuid",                   // Optional: related entity ID
  "includeHistory": true                 // Optional, default: true
}
```

**Response**:
```json
{
  "userMessage": {
    "content": "I'm feeling overwhelmed",
    "isUser": true
  },
  "aiMessage": {
    "content": "I understand how you're feeling...",
    "isUser": false
  },
  "coach": {
    "name": "Daniel",
    "voice": "supportive"
  },
  "context": {
    "type": "category",
    "id": "uuid"
  }
}
```

---

### 6. Get Analytics Summary
**Purpose**: Generate user activity analytics and insights

**Endpoint**: `POST /analytics-summary`

**Headers**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "period": "week"  // Options: "week", "month", "all"
}
```

**Response**:
```json
{
  "summary": {
    "userId": "uuid",
    "period": "week",
    "totalCheckIns": 7,
    "completedCheckIns": 5,
    "topCategories": [
      {
        "categoryId": "uuid",
        "categoryName": "Stress Management",
        "count": 3,
        "lastUsed": "2025-05-25T10:00:00Z"
      }
    ],
    "streakDays": 7,
    "insights": [
      "Great job! You've maintained a 7-day check-in streak.",
      "You've been focusing on Stress Management most frequently."
    ]
  },
  "details": {
    "checkInsPerDay": "1.0",
    "completionRate": "71%",
    "mostActiveTime": "Evening (6 PM - 12 AM)",
    "period": {
      "start": "2025-05-18T00:00:00Z",
      "end": "2025-05-25T00:00:00Z"
    }
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

**Common HTTP Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate active check-in)
- `500 Internal Server Error`: Server error

## Flutter Integration Notes

1. **Direct Database Access**: For simple CRUD operations, use Supabase SDK directly:
   - Getting coaches list
   - Getting categories
   - User profile operations
   - Image uploads/retrieval

2. **Edge Functions**: Use for complex operations:
   - AI-powered recommendations
   - Check-in flows with dynamic questions
   - Chat with AI responses
   - Analytics generation

3. **Authentication**: Always include the Supabase JWT token in headers

4. **Error Handling**: Check for 401 status to trigger re-authentication

## Testing

Each Edge Function includes mocked AI responses until Langflow integration is complete. The mocks provide realistic responses based on user context and input.

## Deployment

Edge Functions are automatically deployed when pushed to the Supabase project. No additional deployment steps required.