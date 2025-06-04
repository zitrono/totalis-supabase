# Version 4.1.2 - Backend Naming Convention Compliance

## Overview
This version enforces snake_case naming conventions across all Edge Functions to align with the database layer and eliminate conversion overhead.

## Policy Reference
Per CLAUDE.md naming conventions:
- Database: snake_case (PostgreSQL standard)
- Edge Functions: snake_case (no conversion needed)
- Flutter Internal: camelCase (use code generation)

## Current State Analysis
Deep code analysis reveals inconsistencies:
- 6 out of 10 Edge Functions use camelCase
- Shared types file uses pure camelCase
- Mixed conventions in requests/responses

## Implementation Tasks (Greenfield - No Backward Compatibility Needed)

### Task 1: Update Shared Types
- [ ] **Task 1.1**: Convert `_shared/types.ts` to snake_case
  - UserContext: `userId` → `user_id`, `coachId` → `coach_id`
  - CheckIn: `userId` → `user_id`, `categoryId` → `category_id`, `startedAt` → `started_at`
  - CheckInResponse: `questionId` → `question_id`
  - Recommendation: `userId` → `user_id`, `categoryId` → `category_id`, `createdAt` → `created_at`
  - ChatMessage: `userId` → `user_id`, `isUser` → `is_user`, `contextType` → `context_type`, `contextId` → `context_id`
  - AnalyticsSummary: `userId` → `user_id`, `totalCheckIns` → `total_check_ins`, `completedCheckIns` → `completed_check_ins`, `topCategories` → `top_categories`, `streakDays` → `streak_days`
  - CategoryStat: `categoryId` → `category_id`, `categoryName` → `category_name`, `lastUsed` → `last_used`

### Task 2: Update Edge Functions
- [ ] **Task 2.1**: Update `analytics-summary/index.ts`
  - Remove camelCase from responses
  - Use snake_case exclusively: `date_range`, `total_check_ins`, `total_messages`, `avg_wellness_level`, `category_breakdown`, `active_recommendations`, `last_activity`

- [ ] **Task 2.2**: Update `chat-ai-response/index.ts`
  - Convert request handling to snake_case only
  - Convert response fields: `conversation_id`, `user_message`, `ai_message`, `context_used`

- [ ] **Task 2.3**: Update `checkin/index.ts`
  - Remove dual support, use snake_case only
  - Remove camelCase fallbacks

- [ ] **Task 2.4**: Update `recommendations/index.ts`
  - Ensure all response fields use snake_case
  - Remove any camelCase properties

- [ ] **Task 2.5**: Update `report-error/index.ts`
  - Remove dual support, use snake_case only
  - Fields: `user_id`, `error_type`, `error_message`, `stack_trace`

- [ ] **Task 2.6**: Update `_shared/supabase-client.ts`
  - Modify getUserContext to return snake_case properties

- [ ] **Task 2.7**: Clean up `audio-transcription/index.ts`
  - Remove dual support comments
  - Use snake_case exclusively

### Task 3: Remove Legacy Support
- [ ] **Task 3.1**: Remove all camelCase support from Edge Functions
- [ ] **Task 3.2**: Remove any "support both" comments
- [ ] **Task 3.3**: Delete legacy-api function if not needed

### Task 4: Update Tests
- [ ] **Task 4.1**: Update any existing tests to use snake_case
- [ ] **Task 4.2**: Add tests to verify snake_case compliance

### Task 5: Documentation
- [ ] **Task 5.1**: Update API documentation to show snake_case examples
- [ ] **Task 5.2**: Ensure Flutter code generation is configured for snake_case mapping

## Success Criteria
- All Edge Functions use snake_case exclusively
- No camelCase properties in any TypeScript interfaces
- Flutter app works with generated types that handle conversion
- All tests pass with snake_case

## Timeline
- Day 1: Update shared types and all Edge Functions
- Day 2: Testing and documentation
- Day 3: Deploy to production

## Version Bump
After implementation:
- Backend version: 4.1.1 → 4.1.2
- Update package.json version