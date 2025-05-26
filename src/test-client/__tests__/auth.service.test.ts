import { TestAuthService } from '../services/auth.service';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInAnonymously: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      refreshSession: jest.fn()
    }
  }))
}));

describe('TestAuthService', () => {
  let authService: TestAuthService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createClient('', '');
    authService = new TestAuthService(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signInAnonymously', () => {
    it('should sign in anonymously successfully', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.auth.signInAnonymously.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null
      });

      const result = await authService.signInAnonymously();

      expect(mockSupabase.auth.signInAnonymously).toHaveBeenCalled();
      expect(result.user.id).toBe('test-user-id');
      expect(result.user.email).toBeNull();
    });

    it('should throw error when anonymous sign-in fails', async () => {
      mockSupabase.auth.signInAnonymously.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Anonymous sign-in failed' }
      });

      await expect(authService.signInAnonymously()).rejects.toThrow('Anonymous sign-in failed');
    });
  });

  describe('signInWithGoogle', () => {
    it('should simulate Google sign-in for existing user', async () => {
      const mockUser = {
        id: 'google-user-id',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null
      });

      const result = await authService.signInWithGoogle('test@example.com');

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'test-password-123'
      });
      expect(result.user.email).toBe('test@example.com');
    });

    it('should create new user when sign-in fails', async () => {
      const mockUser = {
        id: 'new-google-user-id',
        email: 'newuser@example.com',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' }
      });

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: {} },
        error: null
      });

      const result = await authService.signInWithGoogle('newuser@example.com');

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'test-password-123'
      });
      expect(result.user.email).toBe('newuser@example.com');
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await expect(authService.signOut()).resolves.not.toThrow();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should throw error when sign out fails', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' }
      });

      await expect(authService.signOut()).rejects.toThrow('Sign out failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      const mockUser = {
        id: 'current-user-id',
        email: 'current@example.com',
        created_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const result = await authService.getCurrentUser();

      expect(result).not.toBeNull();
      expect(result!.id).toBe('current-user-id');
    });

    it('should return null when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });
});