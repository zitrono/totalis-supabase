import { describe as jestDescribe, beforeAll, test } from '@jest/globals'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getTestConfig } from '../config/test-env'
import { skipIfPreview } from './skip-auth'
import { getTestUser, TEST_USERS } from './test-categories'

let previewSupabase: SupabaseClient | null = null;

/**
 * Initialize Supabase client for preview-safe tests
 */
async function initPreviewClient(): Promise<SupabaseClient> {
  if (previewSupabase) return previewSupabase;
  
  const config = getTestConfig();
  previewSupabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  
  // Try to sign in with test user
  const testUser = getTestUser(0);
  const { data, error } = await previewSupabase.auth.signInWithPassword({
    email: testUser.email,
    password: testUser.password,
  });
  
  if (error) {
    console.warn(`⚠️  Could not authenticate test user: ${error.message}`);
    console.warn('   Tests will run with anonymous access where possible');
  } else {
    console.log(`✅ Authenticated as test user: ${testUser.email}`);
  }
  
  return previewSupabase;
}

/**
 * Wrapper for preview-safe tests
 * Automatically handles test user authentication
 */
export function describePreviewSafe(
  name: string, 
  fn: (context: PreviewTestContext) => void
) {
  jestDescribe(name, () => {
    let supabase: SupabaseClient;
    let currentUser = getTestUser(0);
    
    beforeAll(async () => {
      supabase = await initPreviewClient();
    });
    
    const context: PreviewTestContext = {
      supabase: () => supabase,
      
      // Sign in as a specific test user
      async signInAs(indexOrEmail: number | string) {
        currentUser = getTestUser(indexOrEmail);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: currentUser.password,
        });
        
        if (error) throw error;
        return data.user!;
      },
      
      // Get current test user
      currentUser: () => currentUser,
      
      // Sign out
      async signOut() {
        await supabase.auth.signOut();
      },
      
      // Helper to run test with fresh user session
      async withUser(indexOrEmail: number | string, testFn: () => Promise<void>) {
        const previousUser = currentUser;
        try {
          await context.signInAs(indexOrEmail);
          await testFn();
        } finally {
          if (previousUser !== currentUser) {
            await context.signInAs(previousUser.email);
          }
        }
      },
    };
    
    fn(context);
  });
}

/**
 * Skip test if running in preview without proper auth
 */
export function testPreviewSafe(
  name: string,
  fn: () => void | Promise<void>
) {
  test(name, async () => {
    const config = getTestConfig();
    
    // In preview, check if we have test users
    if (config.isPreview) {
      const supabase = await initPreviewClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log(`⏭️  Skipping "${name}" - No authenticated user in preview`);
        return;
      }
    }
    
    await fn();
  });
}

/**
 * Context provided to preview-safe tests
 */
export interface PreviewTestContext {
  /**
   * Get the Supabase client (authenticated if possible)
   */
  supabase(): SupabaseClient;
  
  /**
   * Sign in as a specific test user
   */
  signInAs(indexOrEmail: number | string): Promise<any>;
  
  /**
   * Get current test user info
   */
  currentUser(): typeof TEST_USERS[0];
  
  /**
   * Sign out current user
   */
  signOut(): Promise<void>;
  
  /**
   * Run a test with a specific user
   */
  withUser(indexOrEmail: number | string, testFn: () => Promise<void>): Promise<void>;
}