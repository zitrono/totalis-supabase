# Monitoring and Analytics Integration

This document outlines the integration of Sentry and PostHog for comprehensive monitoring and analytics in the Totalis wellness platform.

## Overview

- **Sentry**: Error tracking, performance monitoring, and application health
- **PostHog**: User analytics, feature usage tracking, and behavioral insights

## Configured Credentials

### Sentry
- **DSN**: `https://d141fc76fe8e9c32502589ab3ddbe966@o4509385237266432.ingest.de.sentry.io/4509385315647568`
- **Project ID**: 4509385315647568
- **Organization**: o4509385237266432
- **Region**: Europe (de.sentry.io)

### PostHog
- **API Key**: `phc_cGoD8ZMiCEEch9XvuuBShALjD1Lnr3RUh7K66LeZXin`
- **Instance**: Cloud (default)

## Implementation Plan

### Phase 5.1: Edge Functions Integration

#### Sentry in Edge Functions
```typescript
// supabase/functions/_shared/sentry.ts
import * as Sentry from "@sentry/node";

const sentryDsn = Deno.env.get("SENTRY_DSN");

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: "production",
    sendDefaultPii: true,
    beforeSend(event) {
      // Remove sensitive data
      if (event.request?.headers) {
        delete event.request.headers.authorization;
      }
      return event;
    }
  });
}

export { Sentry };
```

#### PostHog in Edge Functions
```typescript
// supabase/functions/_shared/posthog.ts
import { PostHog } from 'posthog-node';

const posthogApiKey = Deno.env.get("POSTHOG_API_KEY");

export const posthog = posthogApiKey 
  ? new PostHog(posthogApiKey, { host: 'https://app.posthog.com' })
  : null;

export function trackEvent(userId: string, event: string, properties?: Record<string, any>) {
  if (posthog) {
    posthog.capture({
      distinctId: userId,
      event,
      properties: {
        ...properties,
        source: 'edge_function'
      }
    });
  }
}
```

### Phase 5.2: Mobile App Integration

#### Sentry in Flutter
```dart
// lib/services/sentry_service.dart
import 'package:sentry_flutter/sentry_flutter.dart';

class SentryService {
  static Future<void> init() async {
    await SentryFlutter.init(
      (options) {
        options.dsn = 'https://d141fc76fe8e9c32502589ab3ddbe966@o4509385237266432.ingest.de.sentry.io/4509385315647568';
        options.environment = 'production';
        options.release = '1.0.0'; // Use actual app version
        options.attachScreenshot = true;
        options.beforeSend = (event, hint) {
          // Remove sensitive data
          return event;
        };
      },
    );
  }
  
  static void captureException(dynamic exception, StackTrace? stackTrace) {
    Sentry.captureException(exception, stackTrace: stackTrace);
  }
  
  static void addBreadcrumb(String message, {String? category}) {
    Sentry.addBreadcrumb(Breadcrumb(
      message: message,
      category: category ?? 'user_action',
      timestamp: DateTime.now(),
    ));
  }
}
```

#### PostHog in Flutter
```dart
// lib/services/analytics_service.dart
import 'package:posthog_flutter/posthog_flutter.dart';

class AnalyticsService {
  static Future<void> init() async {
    await Posthog.setup('phc_cGoD8ZMiCEEch9XvuuBShALjD1Lnr3RUh7K66LeZXin');
  }
  
  static void identify(String userId, Map<String, dynamic> properties) {
    Posthog.identify(userId: userId, userProperties: properties);
  }
  
  static void track(String event, {Map<String, dynamic>? properties}) {
    Posthog.capture(eventName: event, properties: properties);
  }
  
  static void screen(String screenName, {Map<String, dynamic>? properties}) {
    Posthog.screen(screenName: screenName, properties: properties);
  }
}
```

## Key Events to Track

### User Journey Events
```typescript
// Core user actions
const EVENTS = {
  // Authentication
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_PROFILE_CREATED: 'user_profile_created',
  
  // Coach Interaction
  COACH_SELECTED: 'coach_selected',
  MESSAGE_SENT: 'message_sent',
  AI_RESPONSE_RECEIVED: 'ai_response_received',
  
  // Check-ins
  CHECKIN_STARTED: 'checkin_started',
  CHECKIN_COMPLETED: 'checkin_completed',
  CHECKIN_ABORTED: 'checkin_aborted',
  
  // Audio Features
  AUDIO_RECORDED: 'audio_recorded',
  AUDIO_TRANSCRIBED: 'audio_transcribed',
  AUDIO_TRANSCRIPTION_FAILED: 'audio_transcription_failed',
  
  // Health Cards
  HEALTH_CARD_VIEWED: 'health_card_viewed',
  RECOMMENDATION_ACCEPTED: 'recommendation_accepted',
  CATEGORY_EXPLORED: 'category_explored',
  
  // Engagement
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
  FEATURE_DISCOVERED: 'feature_discovered',
} as const;
```

### Error Categories for Sentry
```typescript
// Error categories
const ERROR_CATEGORIES = {
  // API Errors
  SUPABASE_CONNECTION: 'supabase_connection_error',
  OPENAI_API: 'openai_api_error',
  EDGE_FUNCTION: 'edge_function_error',
  
  // User Experience
  AUDIO_RECORDING: 'audio_recording_error',
  NETWORK_TIMEOUT: 'network_timeout',
  AUTHENTICATION: 'authentication_error',
  
  // Data Issues
  SCHEMA_VALIDATION: 'schema_validation_error',
  MIGRATION_ERROR: 'migration_error',
} as const;
```

## Usage Examples

### Edge Function with Monitoring
```typescript
// supabase/functions/audio-transcribe/index.ts
import { Sentry } from "../_shared/sentry.ts";
import { trackEvent } from "../_shared/posthog.ts";

serve(async (req) => {
  const transaction = Sentry.startTransaction({
    name: "audio-transcribe",
    op: "function",
  });
  
  try {
    // ... existing code ...
    
    // Track successful transcription
    trackEvent(user.id, 'audio_transcribed', {
      fileSize: audioFile.size,
      processingTime: processingTime,
      format: audioFile.type
    });
    
    return new Response(JSON.stringify(result));
    
  } catch (error) {
    Sentry.captureException(error);
    trackEvent(user.id, 'audio_transcription_failed', {
      error: error.message
    });
    throw error;
  } finally {
    transaction.finish();
  }
});
```

### Mobile App Screen Tracking
```dart
// lib/screens/chat_screen.dart
class ChatScreen extends StatefulWidget {
  @override
  void initState() {
    super.initState();
    
    // Track screen view
    AnalyticsService.screen('chat_screen', {
      'coach_id': widget.coachId,
      'timestamp': DateTime.now().toIso8601String(),
    });
    
    // Add breadcrumb
    SentryService.addBreadcrumb('Chat screen opened', category: 'navigation');
  }
  
  void _sendMessage(String message) {
    try {
      // Send message logic
      
      AnalyticsService.track('message_sent', {
        'message_length': message.length,
        'coach_id': coachId,
        'session_duration': _getSessionDuration(),
      });
      
    } catch (error, stackTrace) {
      SentryService.captureException(error, stackTrace);
      
      AnalyticsService.track('message_send_failed', {
        'error': error.toString(),
      });
    }
  }
}
```

## Dashboards and Alerts

### Sentry Alerts
- Edge function error rate > 5%
- Audio transcription failures > 10%
- User authentication errors
- Performance degradation (response time > 2s)

### PostHog Insights
- Daily/weekly active users
- Check-in completion rates
- Audio feature usage
- Coach interaction patterns
- User journey funnels
- Feature adoption rates

## Privacy and Compliance

### Data Handling
- **PII Protection**: Never log sensitive user data (messages, health info)
- **Anonymization**: Use hashed user IDs where possible
- **Retention**: Set appropriate data retention policies
- **GDPR**: Respect user consent and deletion requests

### Configuration
```typescript
// Privacy-first configuration
const privacyConfig = {
  sentry: {
    beforeSend: (event) => {
      // Remove sensitive headers and data
      delete event.request?.headers?.authorization;
      delete event.extra?.user_messages;
      return event;
    }
  },
  posthog: {
    opt_out_capturing_by_default: false,
    respect_dnt: true,
    property_blacklist: ['$initial_referrer', '$initial_referring_domain']
  }
};
```

## Implementation Priority

1. **Phase 5.1**: Basic error tracking in edge functions
2. **Phase 5.2**: Core event tracking for user journeys
3. **Phase 6.1**: Mobile app integration
4. **Phase 6.2**: Advanced analytics and insights
5. **Phase 7.1**: Performance monitoring and optimization

## Success Metrics

### Technical Health
- Error rate < 1%
- 99.9% uptime
- Average response time < 500ms
- Zero critical security incidents

### User Engagement
- Daily active users growth
- Check-in completion rate > 80%
- Audio feature adoption > 30%
- User retention > 70% (7-day)

---

*Document created: May 25, 2025*
*Status: Credentials configured, implementation pending*