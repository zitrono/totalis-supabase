import { SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, CreateUserProfileRequest } from '../types';

export class TestUserService {
  constructor(private supabase: SupabaseClient) {}

  async createProfile(data: CreateUserProfileRequest): Promise<UserProfile> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Check if profile already exists (created by trigger)
    const existingProfile = await this.getProfile();
    
    if (existingProfile) {
      // Update existing profile with user data
      return this.updateProfile({
        name: data.name,
        year_of_birth: data.dateOfBirth.getFullYear(),
        sex: data.sex,
        coach_id: data.coachId || existingProfile.coach_id
      });
    }

    // Create user profile if it doesn't exist
    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .insert({
        id: user.id, // Use auth user ID as profile ID
        name: data.name,
        year_of_birth: data.dateOfBirth.getFullYear(),
        sex: data.sex,
        coach_id: data.coachId // Will be set by trigger if not provided
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user profile: ${error.message}`);
    }

    return this.mapProfile(profile);
  }

  async getProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw new Error(`Failed to get user profile: ${error.message}`);
    }

    return this.mapProfile(profile);
  }

  async updateProfile(updates: any): Promise<UserProfile> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: profile, error } = await this.supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    return this.mapProfile(profile);
  }

  async selectCoach(coachId: string): Promise<UserProfile> {
    return this.updateProfile({ coach_id: coachId });
  }

  async checkProfileExists(): Promise<boolean> {
    const profile = await this.getProfile();
    return profile !== null;
  }

  async deleteProfile(): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { error } = await this.supabase
      .from('user_profiles')
      .delete()
      .eq('id', user.id);

    if (error) {
      throw new Error(`Failed to delete user profile: ${error.message}`);
    }
  }

  private mapProfile(data: any): UserProfile {
    return {
      id: data.id,
      user_id: data.id, // Same as id for this implementation
      name: data.name,
      date_of_birth: data.year_of_birth ? `${data.year_of_birth}-01-01` : '',
      sex: data.sex,
      coach_id: data.coach_id,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}