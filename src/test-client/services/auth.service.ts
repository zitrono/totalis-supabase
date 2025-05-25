import { SupabaseClient } from '@supabase/supabase-js';
import { User, AuthResponse } from '../types';

export class TestAuthService {
  constructor(private supabase: SupabaseClient) {}

  async signInAnonymously(): Promise<AuthResponse> {
    const { data, error } = await this.supabase.auth.signInAnonymously();
    
    if (error) {
      throw new Error(`Anonymous sign-in failed: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('No user returned from anonymous sign-in');
    }

    return {
      user: this.mapUser(data.user),
      session: data.session
    };
  }

  async signInWithGoogle(email: string): Promise<AuthResponse> {
    // For testing, we'll use email/password auth to simulate Google sign-in
    // In production, this would use actual OAuth flow
    const password = 'test-password-123'; // Test password
    
    // First try to sign in
    let { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    // If user doesn't exist, create them
    if (error && error.message.includes('Invalid login credentials')) {
      const signUpResult = await this.supabase.auth.signUp({
        email,
        password
      });
      
      if (signUpResult.error) {
        throw new Error(`Google sign-in simulation failed: ${signUpResult.error.message}`);
      }
      
      data = signUpResult.data as any;
    } else if (error) {
      throw new Error(`Google sign-in simulation failed: ${error.message}`);
    }

    if (!data?.user) {
      throw new Error('No user returned from Google sign-in simulation');
    }

    return {
      user: this.mapUser(data.user),
      session: data.session!
    };
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    
    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    return this.mapUser(user);
  }

  async getSession() {
    const { data: { session }, error } = await this.supabase.auth.getSession();
    
    if (error) {
      throw new Error(`Failed to get session: ${error.message}`);
    }

    return session;
  }

  async refreshSession() {
    const { data: { session }, error } = await this.supabase.auth.refreshSession();
    
    if (error) {
      throw new Error(`Failed to refresh session: ${error.message}`);
    }

    return session;
  }

  private mapUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      created_at: supabaseUser.created_at,
      updated_at: supabaseUser.updated_at || supabaseUser.created_at
    };
  }
}