import { SupabaseClient } from '@supabase/supabase-js';
import { CheckIn, CheckInQuestion, AnswerQuestionRequest } from '../types';

export class TestCheckInService {
  constructor(private supabase: SupabaseClient) {}

  async startCheckIn(categoryId?: string): Promise<CheckIn> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Generate dynamic questions based on category or general
    const questions = this.generateQuestions(categoryId);

    // Create check-in record
    const { data: checkIn, error } = await this.supabase
      .from('check_ins')
      .insert({
        user_id: user.id,
        category_id: categoryId,
        status: 'in_progress',
        questions: questions
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to start check-in: ${error.message}`);
    }

    return this.mapCheckIn(checkIn);
  }

  async answerQuestion(
    checkInId: string, 
    questionIndex: number, 
    answer: string | string[], 
    explanation?: string
  ): Promise<CheckIn> {
    // Get current check-in
    const { data: checkIn, error: fetchError } = await this.supabase
      .from('check_ins')
      .select('*')
      .eq('id', checkInId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch check-in: ${fetchError.message}`);
    }

    if (checkIn.status !== 'in_progress') {
      throw new Error('Check-in is not in progress');
    }

    // Update question with answer
    const questions = checkIn.questions;
    if (questionIndex >= 0 && questionIndex < questions.length) {
      questions[questionIndex].answer = answer;
      if (explanation) {
        questions[questionIndex].explanation = explanation;
      }
    } else {
      throw new Error('Invalid question index');
    }

    // Update check-in
    const { data: updatedCheckIn, error: updateError } = await this.supabase
      .from('check_ins')
      .update({ questions })
      .eq('id', checkInId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update check-in: ${updateError.message}`);
    }

    return this.mapCheckIn(updatedCheckIn);
  }

  async completeCheckIn(checkInId: string): Promise<CheckIn> {
    const { data: checkIn, error: fetchError } = await this.supabase
      .from('check_ins')
      .select('*')
      .eq('id', checkInId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch check-in: ${fetchError.message}`);
    }

    if (checkIn.status !== 'in_progress') {
      throw new Error('Check-in is not in progress');
    }

    // Check all questions are answered
    const unanswered = checkIn.questions.filter((q: any) => !q.answer);
    if (unanswered.length > 0) {
      throw new Error(`${unanswered.length} questions are not answered`);
    }

    // Generate AI insights (simulated)
    const insights = this.generateInsights(checkIn.questions, checkIn.category_id);

    // Update check-in
    const { data: completedCheckIn, error: updateError } = await this.supabase
      .from('check_ins')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        ...insights
      })
      .eq('id', checkInId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to complete check-in: ${updateError.message}`);
    }

    // Trigger card generation (would be done by Edge Function in production)
    await this.generateHealthCards(checkInId, checkIn.user_id, checkIn.category_id);

    return this.mapCheckIn(completedCheckIn);
  }

  async abortCheckIn(checkInId: string): Promise<void> {
    const { error } = await this.supabase
      .from('check_ins')
      .update({ status: 'aborted' })
      .eq('id', checkInId);

    if (error) {
      throw new Error(`Failed to abort check-in: ${error.message}`);
    }
  }

  async getCheckIn(checkInId: string): Promise<CheckIn> {
    const { data: checkIn, error } = await this.supabase
      .from('check_ins')
      .select('*')
      .eq('id', checkInId)
      .single();

    if (error) {
      throw new Error(`Failed to get check-in: ${error.message}`);
    }

    return this.mapCheckIn(checkIn);
  }

  async getUserCheckIns(status?: 'in_progress' | 'completed' | 'aborted'): Promise<CheckIn[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user found');
    }

    let query = this.supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', user.id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: checkIns, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get check-ins: ${error.message}`);
    }

    return checkIns.map(this.mapCheckIn);
  }

  private generateQuestions(categoryId?: string): CheckInQuestion[] {
    // Simulate AI-generated dynamic questions
    const baseQuestions: CheckInQuestion[] = [
      {
        id: '1',
        question: 'How would you rate your overall health today?',
        type: 'radio',
        options: ['Excellent', 'Good', 'Fair', 'Poor']
      },
      {
        id: '2',
        question: 'Which areas of health are you most concerned about?',
        type: 'checkbox',
        options: ['Physical', 'Mental', 'Emotional', 'Social', 'Spiritual']
      },
      {
        id: '3',
        question: 'How well have you been sleeping?',
        type: 'radio',
        options: ['Very well', 'Well', 'Poorly', 'Very poorly']
      }
    ];

    if (categoryId) {
      // Add category-specific questions
      baseQuestions.push({
        id: '4',
        question: 'How satisfied are you with your progress in this area?',
        type: 'radio',
        options: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very dissatisfied']
      });
    }

    // AI would dynamically generate 3-10 questions
    return baseQuestions;
  }

  private generateInsights(questions: any[], categoryId?: string) {
    // Simulate AI-generated insights
    return {
      summary: 'Based on your responses, your overall health appears to be in good condition with some areas for improvement.',
      insight: 'Focus on improving sleep quality and maintaining regular physical activity for better overall wellness.',
      brief: 'Good health, improve sleep',
      level: 75 // 0-100 score
    };
  }

  private async generateHealthCards(checkInId: string, userId: string, categoryId?: string) {
    // Simulate AI-generated health cards
    const cards = [
      {
        user_id: userId,
        category_id: categoryId || null,
        checkin_id: checkInId,
        type: 1, // Action recommendation
        title: 'Improve Sleep Quality',
        content: 'Try establishing a consistent bedtime routine and avoiding screens 1 hour before sleep.',
        importance: 8,
        is_checked: false,
        expires_at: new Date(Date.now() + 196 * 60 * 60 * 1000).toISOString() // 196 hours
      },
      {
        user_id: userId,
        category_id: categoryId || null,
        checkin_id: checkInId,
        type: 2, // Category insight
        title: 'Mental Health Check-in Recommended',
        content: 'Based on your responses, a focused mental health assessment could provide valuable insights.',
        importance: 7,
        is_checked: false,
        expires_at: new Date(Date.now() + 196 * 60 * 60 * 1000).toISOString()
      }
    ];

    const { error } = await this.supabase
      .from('health_cards')
      .insert(cards);

    if (error) {
      console.error('Failed to generate health cards:', error);
    }
  }

  private mapCheckIn(data: any): CheckIn {
    return {
      id: data.id,
      user_id: data.user_id,
      category_id: data.category_id,
      status: data.status,
      questions: data.questions,
      summary: data.summary,
      insight: data.insight,
      brief: data.brief,
      level: data.level,
      created_at: data.created_at,
      completed_at: data.completed_at
    };
  }
}