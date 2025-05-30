import { supabase, supabaseAdmin } from '../utils/supabase';
import { config } from '../config';

describe('Supabase Connection Tests', () => {
  test('Config loads correctly', () => {
    expect(config.supabase.url).toBe('https://qdqbrqnqttyjegiupvri.supabase.co');
    expect(config.supabase.anonKey).toBeTruthy();
    expect(config.supabase.serviceKey).toBeTruthy();
    expect(config.business.defaultCoach).toBe('Daniel');
  });

  test('Public client can connect', async () => {
    // Test basic connection using the anon key
    const { data, error } = await supabase.auth.getSession();
    
    // Should not error, but session should be null (not logged in)
    expect(error).toBeNull();
    expect(data.session).toBeNull();
  });

  test('Service role client can connect', async () => {
    // Service role should be able to list users (even if empty)
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data.users)).toBe(true);
  });

  test('Can create and query from a test table', async () => {
    // First, let's check if we can query (table might not exist yet)
    const { data, error } = await supabase
      .from('test_connection')
      .select('*')
      .limit(1);
    
    // If table doesn't exist, we'll get an error
    if (error) {
      console.log('Test table does not exist yet, which is expected:', error.message);
      expect(error.message).toContain('test_connection');
    } else {
      // If table exists, data should be an array
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test('Storage buckets configuration is correct', () => {
    expect(config.storage.buckets.coachImages).toBe('coach-images');
    expect(config.storage.buckets.categoryIcons).toBe('category-icons');
    expect(config.storage.buckets.voiceRecordings).toBe('voice-recordings');
  });

  test('Business rules are configured', () => {
    expect(config.business.defaultCoach).toBe('Daniel');
    // Anonymous users are no longer supported
    expect(config.business.anonymousUserExpiration).toBeNull();
    expect(config.business.voiceRecordingMaxSeconds).toBe(60);
    expect(config.business.checkInRules.aiDriven).toBe(true);
  });
});