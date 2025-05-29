# Test Preview Sync

This file is created to test if Supabase preview environment syncing is working properly.

## Test Details
- Branch: test/preview-sync-check
- Date: $(date)
- Purpose: Verify preview environment creation and edge function deployment

## Expected Behavior
1. PR should trigger preview environment creation
2. Edge functions should be automatically deployed to preview
3. Database migrations should be applied
4. All CI/CD checks should pass

## Current Edge Functions in Main
- analytics-summary
- audio-transcribe
- chat-ai-response
- checkin-process
- checkin-start
- langflow-webhook
- legacy-api
- recommendations
- test-recommendations
- text-to-speech

This is a test file that will be removed after verification.