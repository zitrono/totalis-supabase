import { SupabaseClient } from '@supabase/supabase-js';
import { Category, UserCategory, Coach } from '../types';

export class TestCategoryService {
  constructor(private supabase: SupabaseClient) {}

  async getAllCategories(): Promise<Category[]> {
    const { data: categories, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to get categories: ${error.message}`);
    }

    return categories.map(this.mapCategory);
  }

  async getCategoryDetails(categoryId: string): Promise<Category> {
    const { data: category, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) {
      throw new Error(`Failed to get category details: ${error.message}`);
    }

    return this.mapCategory(category);
  }

  async getSubcategories(parentId: string): Promise<Category[]> {
    const { data: subcategories, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('parent_id', parentId)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to get subcategories: ${error.message}`);
    }

    return subcategories.map(this.mapCategory);
  }

  async getUserCategories(): Promise<UserCategory[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: userCategories, error } = await this.supabase
      .from('profile_categories')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to get user categories: ${error.message}`);
    }

    return userCategories.map(this.mapUserCategory);
  }

  async getCategoryProgress(categoryId: string): Promise<UserCategory | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: userCategory, error } = await this.supabase
      .from('profile_categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw new Error(`Failed to get category progress: ${error.message}`);
    }

    return this.mapUserCategory(userCategory);
  }

  async markAsFavorite(categoryId: string): Promise<UserCategory> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Upsert user category
    const { data: userCategory, error } = await this.supabase
      .from('profile_categories')
      .upsert({
        user_id: user.id,
        category_id: categoryId,
        is_favorite: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to mark category as favorite: ${error.message}`);
    }

    return this.mapUserCategory(userCategory);
  }

  async unmarkAsFavorite(categoryId: string): Promise<UserCategory> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: userCategory, error } = await this.supabase
      .from('profile_categories')
      .update({ is_favorite: false })
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to unmark category as favorite: ${error.message}`);
    }

    return this.mapUserCategory(userCategory);
  }

  async getFavoriteCategories(): Promise<Category[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: favorites, error } = await this.supabase
      .from('profile_categories')
      .select('category_id')
      .eq('user_id', user.id)
      .eq('is_favorite', true);

    if (error) {
      throw new Error(`Failed to get favorite categories: ${error.message}`);
    }

    if (favorites.length === 0) {
      return [];
    }

    const categoryIds = favorites.map(f => f.category_id);
    const { data: categories, error: catError } = await this.supabase
      .from('categories')
      .select('*')
      .in('id', categoryIds);

    if (catError) {
      throw new Error(`Failed to get category details: ${catError.message}`);
    }

    return categories.map(this.mapCategory);
  }

  async getShortcutCategories(): Promise<Category[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: shortcuts, error } = await this.supabase
      .from('profile_categories')
      .select('category_id')
      .eq('user_id', user.id)
      .eq('is_shortcut', true);

    if (error) {
      throw new Error(`Failed to get shortcut categories: ${error.message}`);
    }

    if (shortcuts.length === 0) {
      return [];
    }

    const categoryIds = shortcuts.map(s => s.category_id);
    const { data: categories, error: catError } = await this.supabase
      .from('categories')
      .select('*')
      .in('id', categoryIds);

    if (catError) {
      throw new Error(`Failed to get category details: ${catError.message}`);
    }

    return categories.map(this.mapCategory);
  }

  async getAvailableCoaches(): Promise<Coach[]> {
    const { data: coaches, error } = await this.supabase
      .from('coaches')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error(`Failed to get coaches: ${error.message}`);
    }

    return coaches.map(this.mapCoach);
  }

  async getCoachDetails(coachId: string): Promise<Coach> {
    const { data: coach, error } = await this.supabase
      .from('coaches')
      .select('*')
      .eq('id', coachId)
      .single();

    if (error) {
      throw new Error(`Failed to get coach details: ${error.message}`);
    }

    return this.mapCoach(coach);
  }

  private mapCategory(data: any): Category {
    return {
      id: data.id,
      name: data.name,
      parent_id: data.parent_id,
      icon_name: data.icon_name,
      primary_color: data.primary_color,
      secondary_color: data.secondary_color,
      order_index: data.order_index,
      created_at: data.created_at
    };
  }

  private mapUserCategory(data: any): UserCategory {
    return {
      id: data.id,
      user_id: data.user_id,
      category_id: data.category_id,
      progress: data.progress,
      is_favorite: data.is_favorite,
      is_shortcut: data.is_shortcut,
      last_checkin_at: data.last_checkin_at,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }

  private mapCoach(data: any): Coach {
    return {
      id: data.id,
      name: data.name,
      avatar_url: data.avatar_url,
      voice_id: data.voice_id,
      prompt: data.prompt,
      is_active: data.is_active,
      created_at: data.created_at
    };
  }
}