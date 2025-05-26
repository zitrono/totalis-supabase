// Monitoring and analytics utilities for Edge Functions
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

// Sentry integration (mock for now - will use Sentry Edge SDK when available)
export class SentryClient {
  private dsn: string;
  private environment: string;

  constructor() {
    this.dsn = Deno.env.get("SENTRY_DSN") || "";
    this.environment = Deno.env.get("DENO_ENV") || "production";
  }

  async captureException(error: Error, context?: Record<string, any>) {
    // In production, this would send to Sentry
    console.error("[Sentry] Exception captured:", {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      environment: this.environment,
      timestamp: new Date().toISOString(),
    });

    // Store in database for now
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from("error_logs").insert({
        function_name: context?.functionName || "unknown",
        error_message: error.message,
        error_stack: error.stack,
        error_type: error.name,
        user_id: context?.userId,
        request_data: context?.requestData,
        environment: this.environment,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Failed to log error to database:", logError);
    }
  }

  async captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
    console.log(`[Sentry] ${level.toUpperCase()}: ${message}`);
  }

  setUser(user: { id: string; email?: string }) {
    // In production, this would set the user context for Sentry
    console.log("[Sentry] User context set:", user);
  }

  addBreadcrumb(breadcrumb: {
    message: string;
    category?: string;
    level?: string;
    data?: Record<string, any>;
  }) {
    console.log("[Sentry] Breadcrumb:", breadcrumb);
  }
}

// PostHog integration
export class PostHogClient {
  private apiKey: string;
  private host: string;

  constructor() {
    this.apiKey = Deno.env.get("POSTHOG_API_KEY") || "";
    this.host = "https://app.posthog.com";
  }

  async capture(event: {
    distinctId: string;
    event: string;
    properties?: Record<string, any>;
  }) {
    if (!this.apiKey) {
      console.log("[PostHog] Event (no API key):", event);
      return;
    }

    try {
      const response = await fetch(`${this.host}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          event: event.event,
          distinct_id: event.distinctId,
          properties: {
            ...event.properties,
            $lib: "deno",
            $lib_version: "1.0.0",
          },
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`PostHog API error: ${response.statusText}`);
      }
    } catch (error) {
      console.error("[PostHog] Failed to send event:", error);
      
      // Store locally as fallback
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase.from("analytics_events").insert({
          user_id: event.distinctId,
          event_type: event.event,
          event_data: event.properties,
          source: "posthog_fallback",
          created_at: new Date().toISOString(),
        });
      } catch (fallbackError) {
        console.error("Failed to store event locally:", fallbackError);
      }
    }
  }

  async identify(userId: string, properties?: Record<string, any>) {
    await this.capture({
      distinctId: userId,
      event: "$identify",
      properties,
    });
  }

  async pageview(userId: string, pageName: string, properties?: Record<string, any>) {
    await this.capture({
      distinctId: userId,
      event: "$pageview",
      properties: {
        $current_url: pageName,
        ...properties,
      },
    });
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private startTime: number;
  private functionName: string;
  private userId?: string;

  constructor(functionName: string, userId?: string) {
    this.startTime = Date.now();
    this.functionName = functionName;
    this.userId = userId;
  }

  async end(metadata?: Record<string, any>) {
    const duration = Date.now() - this.startTime;

    // Log performance metrics
    console.log(`[Performance] ${this.functionName} completed in ${duration}ms`);

    // Store in analytics
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from("performance_logs").insert({
        function_name: this.functionName,
        user_id: this.userId,
        duration_ms: duration,
        metadata,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to log performance metrics:", error);
    }

    return duration;
  }
}

// Rate limiting helper
export class RateLimiter {
  private static instances = new Map<string, RateLimiter>();
  private requests = new Map<string, number[]>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  static getInstance(key: string, windowMs?: number, maxRequests?: number): RateLimiter {
    if (!this.instances.has(key)) {
      this.instances.set(key, new RateLimiter(windowMs, maxRequests));
    }
    return this.instances.get(key)!;
  }

  isAllowed(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(userId, validRequests);
    
    return true;
  }

  getRemainingRequests(userId: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

// Singleton instances
export const sentry = new SentryClient();
export const posthog = new PostHogClient();

// Helper function to wrap edge function with monitoring
export function withMonitoring(functionName: string, handler: Function) {
  return async (req: Request) => {
    const monitor = new PerformanceMonitor(functionName);
    let userId: string | undefined;

    try {
      // Extract user ID if available
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: {
            headers: {
              Authorization: authHeader,
            },
          },
        });

        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;

        if (userId) {
          sentry.setUser({ id: userId });
          monitor.userId = userId;
        }
      }

      // Add breadcrumb
      sentry.addBreadcrumb({
        message: `${functionName} started`,
        category: "edge-function",
        data: {
          method: req.method,
          url: req.url,
        },
      });

      // Execute the actual handler
      const response = await handler(req);

      // Track successful execution
      if (userId) {
        await posthog.capture({
          distinctId: userId,
          event: `${functionName}_success`,
          properties: {
            status: response.status,
            duration_ms: Date.now() - monitor.startTime,
          },
        });
      }

      await monitor.end({
        status: response.status,
        userId,
      });

      return response;
    } catch (error) {
      // Capture exception
      await sentry.captureException(error, {
        functionName,
        userId,
        requestData: await req.json().catch(() => ({})),
      });

      // Track error
      if (userId) {
        await posthog.capture({
          distinctId: userId,
          event: `${functionName}_error`,
          properties: {
            error: error.message,
            duration_ms: Date.now() - monitor.startTime,
          },
        });
      }

      await monitor.end({
        status: "error",
        error: error.message,
        userId,
      });

      throw error;
    }
  };
}