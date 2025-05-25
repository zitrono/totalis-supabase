import { SupabaseClient } from '@supabase/supabase-js';
import { Message, SendMessageRequest } from '../types';

export class TestChatService {
  constructor(private supabase: SupabaseClient) {}

  async sendMessage(content: string): Promise<Message> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Get user's coach
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('coach_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Create user message
    const { data: message, error } = await this.supabase
      .from('messages')
      .insert({
        user_id: user.id,
        coach_id: profile.coach_id,
        role: 'user',
        content
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }

    // In a real implementation, this would trigger an Edge Function to get AI response
    // For testing, we'll simulate the AI response
    await this.simulateAIResponse(user.id, profile.coach_id, content);

    return this.mapMessage(message);
  }

  async getMessages(limit: number = 20): Promise<Message[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: messages, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    return messages.map(this.mapMessage).reverse(); // Return in chronological order
  }

  async getChatHistory(): Promise<Message[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: messages, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get chat history: ${error.message}`);
    }

    return messages.map(this.mapMessage);
  }

  async createSystemMessage(content: string): Promise<Message> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('coach_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    const { data: message, error } = await this.supabase
      .from('messages')
      .insert({
        user_id: user.id,
        coach_id: profile.coach_id,
        role: 'system',
        content
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create system message: ${error.message}`);
    }

    return this.mapMessage(message);
  }

  async createPreAssistantMessage(): Promise<Message> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('coach_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Create a PreAssistant message for Claude compatibility
    const { data: message, error } = await this.supabase
      .from('messages')
      .insert({
        user_id: user.id,
        coach_id: profile.coach_id,
        role: 'preassistant',
        content: 'Hello! I\'m here to help you with your health journey.'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create preassistant message: ${error.message}`);
    }

    return this.mapMessage(message);
  }

  private async simulateAIResponse(userId: string, coachId: string, userMessage: string): Promise<Message> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate contextual response based on user message
    let responseContent = '';
    let answerOptions = undefined;

    if (userMessage.toLowerCase().includes('check') || userMessage.toLowerCase().includes('health')) {
      responseContent = 'I see you\'re interested in checking on your health. Would you like to do a general health check-in or focus on a specific area?';
      answerOptions = {
        type: 'radio' as const,
        options: ['General check-in', 'Specific category', 'Tell me more about check-ins']
      };
    } else if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
      responseContent = 'Hello! It\'s great to see you. How are you feeling today? Would you like to start with a general health check-in?';
    } else {
      responseContent = `I understand you're saying "${userMessage}". Let me help you with that. What specific aspect of your health would you like to explore?`;
    }

    // Create assistant response
    const { data: aiMessage, error } = await this.supabase
      .from('messages')
      .insert({
        user_id: userId,
        coach_id: coachId,
        role: 'assistant',
        content: responseContent,
        answer_options: answerOptions
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create AI response: ${error.message}`);
    }

    return this.mapMessage(aiMessage);
  }

  private mapMessage(data: any): Message {
    return {
      id: data.id,
      user_id: data.user_id,
      coach_id: data.coach_id,
      role: data.role,
      content: data.content,
      answer_options: data.answer_options,
      created_at: data.created_at
    };
  }
}