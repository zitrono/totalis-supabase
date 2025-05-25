import { SupabaseClient } from '@supabase/supabase-js';
import { HealthCard } from '../types';

export class TestCardService {
  constructor(private supabase: SupabaseClient) {}

  async getActiveCards(): Promise<HealthCard[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: cards, error } = await this.supabase
      .from('health_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_checked', false)
      .gte('expires_at', new Date().toISOString())
      .order('importance', { ascending: false });

    if (error) {
      throw new Error(`Failed to get active cards: ${error.message}`);
    }

    return cards.map(this.mapCard);
  }

  async getCardsByCategory(categoryId: string): Promise<HealthCard[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: cards, error } = await this.supabase
      .from('health_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .gte('expires_at', new Date().toISOString())
      .order('importance', { ascending: false });

    if (error) {
      throw new Error(`Failed to get cards by category: ${error.message}`);
    }

    return cards.map(this.mapCard);
  }

  async getCardsByCheckIn(checkInId: string): Promise<HealthCard[]> {
    const { data: cards, error } = await this.supabase
      .from('health_cards')
      .select('*')
      .eq('checkin_id', checkInId)
      .order('importance', { ascending: false });

    if (error) {
      throw new Error(`Failed to get cards by check-in: ${error.message}`);
    }

    return cards.map(this.mapCard);
  }

  async markCardAsChecked(cardId: string): Promise<HealthCard> {
    const { data: card, error } = await this.supabase
      .from('health_cards')
      .update({ is_checked: true })
      .eq('id', cardId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to mark card as checked: ${error.message}`);
    }

    return this.mapCard(card);
  }

  async getCardDetails(cardId: string): Promise<HealthCard> {
    const { data: card, error } = await this.supabase
      .from('health_cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (error) {
      throw new Error(`Failed to get card details: ${error.message}`);
    }

    return this.mapCard(card);
  }

  async getType2Cards(): Promise<HealthCard[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Type 2 cards are insights that can trigger check-ins
    const { data: cards, error } = await this.supabase
      .from('health_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 2)
      .eq('is_checked', false)
      .gte('expires_at', new Date().toISOString())
      .order('importance', { ascending: false });

    if (error) {
      throw new Error(`Failed to get type 2 cards: ${error.message}`);
    }

    return cards.map(this.mapCard);
  }

  async getCardStats(): Promise<{
    total: number;
    active: number;
    checked: number;
    expired: number;
    byType: { type1: number; type2: number };
  }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: allCards, error } = await this.supabase
      .from('health_cards')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to get card stats: ${error.message}`);
    }

    const now = new Date().toISOString();
    const stats = {
      total: allCards.length,
      active: allCards.filter(c => !c.is_checked && c.expires_at > now).length,
      checked: allCards.filter(c => c.is_checked).length,
      expired: allCards.filter(c => c.expires_at <= now && !c.is_checked).length,
      byType: {
        type1: allCards.filter(c => c.type === 1).length,
        type2: allCards.filter(c => c.type === 2).length
      }
    };

    return stats;
  }

  async deleteExpiredCards(): Promise<number> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: deletedCards, error } = await this.supabase
      .from('health_cards')
      .delete()
      .eq('user_id', user.id)
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) {
      throw new Error(`Failed to delete expired cards: ${error.message}`);
    }

    return deletedCards?.length || 0;
  }

  private mapCard(data: any): HealthCard {
    return {
      id: data.id,
      user_id: data.user_id,
      category_id: data.category_id,
      checkin_id: data.checkin_id,
      type: data.type,
      title: data.title,
      content: data.content,
      importance: data.importance,
      is_checked: data.is_checked,
      expires_at: data.expires_at,
      created_at: data.created_at
    };
  }
}