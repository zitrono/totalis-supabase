interface SentryConfig {
  dsn: string
  environment: string
  release?: string
}

interface PostHogConfig {
  apiKey: string
  apiHost: string
}

// Initialize monitoring services
export function initializeMonitoring() {
  const isTest = Deno.env.get('ENVIRONMENT') === 'test'
  
  // Sentry configuration
  if (Deno.env.get('SENTRY_DSN')) {
    const sentryConfig: SentryConfig = {
      dsn: Deno.env.get('SENTRY_DSN')!,
      environment: Deno.env.get('ENVIRONMENT') || 'production',
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

// Capture error
export function captureError(error: Error, context: Record<string, any> = {}) {
  const errorContext: Record<string, any> = {
    ...context,
    timestamp: new Date().toISOString(),
    environment: Deno.env.get('ENVIRONMENT') || 'production'
  }
  
  // In production, this would send to Sentry
  console.error('Error captured:', error.message, errorContext)
  
  // If Sentry is configured, send the error
  if (Deno.env.get('SENTRY_DSN')) {
    // Sentry.captureException(error, { extra: errorContext })
  }
}

// Track event
export function trackEvent(
  eventName: string, 
  properties: Record<string, any> = {}, 
  userId?: string
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
  
  // In production, this would send to PostHog
  console.log('Event tracked:', eventData)
  
  // If PostHog is configured, send the event
  if (Deno.env.get('POSTHOG_API_KEY')) {
    // posthog.capture(eventData.event, eventData.properties)
  }
}

// Track metric
export function trackMetric(
  metricName: string,
  value: number,
  tags: Record<string, string> = {}
) {
  const metric = {
    name: metricName,
    value,
    tags: {
      ...tags,
      environment: Deno.env.get('ENVIRONMENT') || 'production'
    },
    timestamp: new Date().toISOString()
  }
  
  console.log('Metric tracked:', metric)
  
  // In production, this would send to a metrics service
  // e.g., DataDog, CloudWatch, etc.
}

// Helper to check if monitoring is enabled
export function isMonitoringEnabled(): boolean {
  return !!(Deno.env.get('SENTRY_DSN') || Deno.env.get('POSTHOG_API_KEY'))
}

// Create monitoring context for a request
export function createMonitoringContext(functionName: string, metadata?: any) {
  return {
    functionName,
    metadata,
    timestamp: new Date().toISOString(),
    trackSuccess: (userIdOrData?: any, additionalData?: any) => {
      // Handle both trackSuccess(data) and trackSuccess(userId, data) patterns
      let eventData: any = {}
      if (typeof userIdOrData === 'string') {
        eventData.userId = userIdOrData
        eventData = { ...eventData, ...additionalData }
      } else {
        eventData = userIdOrData || {}
      }
      trackEvent(`${functionName}.success`, { ...eventData, ...metadata })
    },
    trackError: (error: Error | string) => {
      const err = error instanceof Error ? error : new Error(String(error))
      captureError(err, { functionName, ...metadata })
      trackEvent(`${functionName}.error`, { 
        error: err.message, 
        ...metadata 
      })
    }
  }
}