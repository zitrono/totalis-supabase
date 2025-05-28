/// <reference lib="deno.ns" />

import { TestMetadata } from './test-data.ts'

interface SentryConfig {
  dsn: string
  environment: string
  release?: string
}

interface PostHogConfig {
  apiKey: string
  apiHost: string
}

// Initialize monitoring services with test awareness
export function initializeMonitoring(testMetadata?: TestMetadata | null) {
  const isTest = !!testMetadata
  
  // Sentry configuration
  if (Deno.env.get('SENTRY_DSN')) {
    const sentryConfig: SentryConfig = {
      dsn: Deno.env.get('SENTRY_DSN')!,
      environment: isTest ? 'test' : (Deno.env.get('ENVIRONMENT') || 'production'),
      release: Deno.env.get('RELEASE_VERSION')
    }
    
    // In a real implementation, you would initialize Sentry here
    // For now, we'll just log the config
    console.log('Sentry initialized:', {
      environment: sentryConfig.environment,
      isTest
    })
  }
  
  // PostHog configuration
  if (Deno.env.get('POSTHOG_API_KEY')) {
    const posthogConfig: PostHogConfig = {
      apiKey: Deno.env.get('POSTHOG_API_KEY')!,
      apiHost: Deno.env.get('POSTHOG_API_HOST') || 'https://app.posthog.com'
    }
    
    console.log('PostHog initialized:', {
      apiHost: posthogConfig.apiHost,
      isTest
    })
  }
}

// Capture error with test awareness
export function captureError(error: Error, context: Record<string, any> = {}, testMetadata?: TestMetadata | null) {
  const errorContext: Record<string, any> = {
    ...context,
    timestamp: new Date().toISOString(),
    environment: Deno.env.get('ENVIRONMENT') || 'production'
  }
  
  if (testMetadata) {
    errorContext.test = true
    errorContext.test_run_id = testMetadata.test_run_id
    errorContext.test_scenario = testMetadata.test_scenario
    
    // Don't send test errors to Sentry in production
    if (Deno.env.get('ENVIRONMENT') === 'production') {
      console.log('[TEST ERROR - Not sent to Sentry]:', error.message, errorContext)
      return
    }
  }
  
  // In production, this would send to Sentry
  console.error('Error captured:', error.message, errorContext)
  
  // If Sentry is configured, send the error
  if (Deno.env.get('SENTRY_DSN')) {
    // Sentry.captureException(error, { extra: errorContext })
  }
}

// Track event with test awareness
export function trackEvent(
  eventName: string, 
  properties: Record<string, any> = {}, 
  userId?: string,
  testMetadata?: TestMetadata | null
) {
  const eventData: {
    event: string;
    properties: Record<string, any>;
    userId: string;
  } = {
    event: eventName,
    properties: {
      ...properties,
      timestamp: new Date().toISOString()
    },
    userId: userId || 'anonymous'
  }
  
  if (testMetadata) {
    eventData.properties.$test = true
    eventData.properties.$test_run_id = testMetadata.test_run_id
    eventData.properties.$test_scenario = testMetadata.test_scenario
    
    // Use test user ID to avoid polluting real user analytics
    eventData.userId = `test_${testMetadata.test_run_id}`
    
    // Add test prefix to event name for easy filtering
    eventData.event = `test_${eventName}`
  }
  
  // Log event (in production, this would send to PostHog)
  console.log('Event tracked:', eventData)
  
  // If PostHog is configured, send the event
  if (Deno.env.get('POSTHOG_API_KEY')) {
    // posthog.capture(eventData)
  }
}

// Track performance metrics with test awareness
export function trackPerformance(
  metricName: string,
  value: number,
  unit: string = 'ms',
  tags: Record<string, string> = {},
  testMetadata?: TestMetadata | null
) {
  const metric = {
    name: metricName,
    value,
    unit,
    tags: {
      ...tags,
      environment: Deno.env.get('ENVIRONMENT') || 'production'
    },
    timestamp: new Date().toISOString()
  }
  
  if (testMetadata) {
    metric.tags.test = 'true'
    metric.tags.test_run_id = testMetadata.test_run_id
    metric.name = `test.${metricName}`
  }
  
  // Log metric (in production, this would send to monitoring service)
  console.log('Performance metric:', metric)
  
  // If Sentry is configured, track transaction
  if (Deno.env.get('SENTRY_DSN')) {
    // Sentry.trackTransaction(metric)
  }
}

// Create a monitoring context for a function execution
export function createMonitoringContext(functionName: string, testMetadata?: TestMetadata | null) {
  const startTime = Date.now()
  const context = {
    functionName,
    startTime,
    testMetadata
  }
  
  // Initialize monitoring with test awareness
  initializeMonitoring(testMetadata)
  
  return {
    // Track function start
    trackStart: (userId?: string) => {
      trackEvent(`function_${functionName}_start`, {
        function: functionName
      }, userId, testMetadata)
    },
    
    // Track function success
    trackSuccess: (userId?: string, additionalProps?: Record<string, any>) => {
      const duration = Date.now() - startTime
      
      trackEvent(`function_${functionName}_success`, {
        function: functionName,
        duration_ms: duration,
        ...additionalProps
      }, userId, testMetadata)
      
      trackPerformance(`function.${functionName}.duration`, duration, 'ms', {
        status: 'success'
      }, testMetadata)
    },
    
    // Track function error
    trackError: (error: Error, userId?: string) => {
      const duration = Date.now() - startTime
      
      captureError(error, {
        function: functionName,
        duration_ms: duration
      }, testMetadata)
      
      trackEvent(`function_${functionName}_error`, {
        function: functionName,
        error: error.message,
        duration_ms: duration
      }, userId, testMetadata)
      
      trackPerformance(`function.${functionName}.duration`, duration, 'ms', {
        status: 'error'
      }, testMetadata)
    },
    
    // Get context for logging
    getContext: () => context
  }
}