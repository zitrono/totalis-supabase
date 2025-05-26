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
      const updatedProfile = await this.updateProfile({
        name: data.name,
        year_of_birth: data.dateOfBirth.getFullYear(),
        sex: data.sex,
        coach_id: data.coachId || existingProfile.coach_id
      });

      // Create initial greeting if no messages exist
      const { data: messages } = await this.supabase
        .from('messages')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (!messages || messages.length === 0) {
        await this.createInitialGreeting(user.id, updatedProfile.coach_id);
      }

      return updatedProfile;
    }

    // Create user profile if it doesn't exist
    const { data: profile, error } = await this.supabase
      .from('profiles')
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

    // Create initial greeting message
    await this.createInitialGreeting(user.id, profile.coach_id);

    return this.mapProfile(profile);
  }

  async getProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data: profile, error } = await this.supabase
      .from('profiles')
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
      .from('profiles')
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
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (error) {
      throw new Error(`Failed to delete user profile: ${error.message}`);
    }
  }

  private async createInitialGreeting(userId: string, coachId: string): Promise<void> {
    try {
      // Get coach name
      const { data: coach } = await this.supabase
        .from('coaches')
        .select('name')
        .eq('id', coachId)
        .single();

      const coachName = coach?.name || 'your coach';
      
      // Create greeting message
      const greetingMessage = `Hello! I'm ${coachName}, your personal wellness coach. I'm here to support you on your health journey. Would you like to start with a quick health check-in to understand where you are today?`;

      await this.supabase
        .from('messages')
        .insert({
          user_id: userId,
          coach_id: coachId,
          role: 'assistant',
          content: greetingMessage,
          content_type: 'text',
          answer_options: {
            type: 'radio',
            options: [
              "Yes, let's do a check-in",
              "Tell me more about check-ins",
              "Maybe later"
            ]
          }
        });
    } catch (error) {
      console.error('Failed to create initial greeting:', error);
      // Don't throw - this is not critical for profile creation
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