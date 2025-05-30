// Test Client for Totalis Supabase Migration
// This client simulates mobile app interactions for testing the new backend

import { SupabaseClient } from '@supabase/supabase-js';
import { TestAuthService } from './services/auth.service';
import { TestUserService } from './services/user.service';
import { TestChatService } from './services/chat.service';
import { TestCheckInService } from './services/checkin.service';
import { TestCardService } from './services/card.service';
import { TestCategoryService } from './services/category.service';
import { TestAudioService } from './services/audio.service';
import { supabase } from '../config/supabase';

export class TotalisTestClient {
  private authService: TestAuthService;
  private userService: TestUserService;
  private chatService: TestChatService;
  private checkInService: TestCheckInService;
  private cardService: TestCardService;
  private categoryService: TestCategoryService;
  private audioService: TestAudioService;

  constructor(private supabaseClient: SupabaseClient = supabase) {
    this.authService = new TestAuthService(supabaseClient);
    this.userService = new TestUserService(supabaseClient);
    this.chatService = new TestChatService(supabaseClient);
    this.checkInService = new TestCheckInService(supabaseClient);
    this.cardService = new TestCardService(supabaseClient);
    this.categoryService = new TestCategoryService(supabaseClient);
    this.audioService = new TestAudioService(supabaseClient);
  }

  // Public getters for services
  get auth() { return this.authService; }
  get user() { return this.userService; }
  get chat() { return this.chatService; }
  get checkIn() { return this.checkInService; }
  get card() { return this.cardService; }
  get category() { return this.categoryService; }
  get audio() { return this.audioService; }
  get supabase() { return this.supabaseClient; }

  // Authentication methods
  // Anonymous authentication has been removed - use email/password or OAuth
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { user: data.user!, session: data.session! };
  }

  async signInWithGoogle(email: string) {
    return this.authService.signInWithGoogle(email);
  }

  async signOut() {
    return this.authService.signOut();
  }

  async getCurrentUser() {
    return this.authService.getCurrentUser();
  }

  // User profile methods
  async createUserProfile(data: {
    name: string;
    dateOfBirth: Date;
    sex: 'male' | 'female' | 'other';
    coachId?: string;
  }) {
    return this.userService.createProfile(data);
  }

  async getUserProfile() {
    return this.userService.getProfile();
  }

  async selectCoach(coachId: string) {
    return this.userService.selectCoach(coachId);
  }

  // Chat methods
  async sendMessage(content: string) {
    return this.chatService.sendMessage(content);
  }

  async getMessages(limit?: number) {
    return this.chatService.getMessages(limit);
  }

  async getChatHistory() {
    return this.chatService.getChatHistory();
  }

  // Check-in methods
  async startCheckIn(categoryId?: string) {
    return this.checkInService.startCheckIn(categoryId);
  }

  async answerQuestion(checkInId: string, questionIndex: number, answer: any, explanation?: string) {
    return this.checkInService.answerQuestion(checkInId, questionIndex, answer, explanation);
  }

  async completeCheckIn(checkInId: string) {
    return this.checkInService.completeCheckIn(checkInId);
  }

  async abortCheckIn(checkInId: string) {
    return this.checkInService.abortCheckIn(checkInId);
  }

  // Card methods
  async getActiveCards() {
    return this.cardService.getActiveCards();
  }

  async getCardsByCategory(categoryId: string) {
    return this.cardService.getCardsByCategory(categoryId);
  }

  async markCardAsChecked(cardId: string) {
    return this.cardService.markCardAsChecked(cardId);
  }

  async getCardDetails(cardId: string) {
    return this.cardService.getCardDetails(cardId);
  }

  // Category methods
  async getAllCategories() {
    return this.categoryService.getAllCategories();
  }

  async getCategoryDetails(categoryId: string) {
    return this.categoryService.getCategoryDetails(categoryId);
  }

  async markCategoryAsFavorite(categoryId: string) {
    return this.categoryService.markAsFavorite(categoryId);
  }

  async getCategoryProgress(categoryId: string) {
    return this.categoryService.getCategoryProgress(categoryId);
  }

  // Audio methods
  async uploadAndTranscribeAudio(audioFile: File | Blob, options?: { prompt?: string; language?: string }) {
    return this.audioService.uploadAndTranscribe(audioFile, options);
  }

  async getAudioUsageStats(month?: Date) {
    return this.audioService.getUsageStats(month);
  }

  async getAudioUsageLogs(limit?: number) {
    return this.audioService.getUsageLogs(limit);
  }

  async testAudioRateLimit(numRequests?: number) {
    return this.audioService.testRateLimit(numRequests);
  }

  async createMockAudioFile(durationSeconds?: number, format?: 'mp3' | 'wav' | 'm4a' | 'ogg' | 'webm') {
    return this.audioService.createMockAudioFile(durationSeconds, format);
  }

  // Getter methods for services
  getCategoryService() {
    return this.categoryService;
  }

  getCheckInService() {
    return this.checkInService;
  }

  getCardService() {
    return this.cardService;
  }

  getAudioService() {
    return this.audioService;
  }

  // Test scenario helpers
  async runNewUserFlow(userData: {
    name: string;
    dateOfBirth: Date;
    sex: 'male' | 'female' | 'other';
  }) {
    console.log('Starting new user flow...');
    
    // 1. Sign in anonymously
    const authResult = await this.signInWithEmail('test3@totalis.app', 'Test123!@#');
    console.log('✓ Signed in anonymously');

    // 2. Create user profile
    const profile = await this.createUserProfile(userData);
    console.log('✓ Created user profile');

    // 3. Get coaches and select one
    const coaches = await this.categoryService.getAvailableCoaches();
    const selectedCoach = coaches[0]; // Default to first coach
    await this.selectCoach(selectedCoach.id);
    console.log(`✓ Selected coach: ${selectedCoach.name}`);

    // 4. Get initial greeting
    const messages = await this.getMessages(1);
    console.log('✓ Received initial greeting');

    // 5. Start general check-in if proposed
    const checkIn = await this.startCheckIn();
    console.log('✓ Started general check-in');

    return {
      user: authResult.user,
      profile,
      coach: selectedCoach,
      checkIn
    };
  }

  async runCheckInFlow(categoryId?: string) {
    console.log(`Starting check-in flow${categoryId ? ` for category ${categoryId}` : ''}...`);

    // 1. Start check-in
    const checkIn = await this.startCheckIn(categoryId);
    console.log(`✓ Started check-in with ${checkIn.questions.length} questions`);

    // 2. Answer each question
    for (let i = 0; i < checkIn.questions.length; i++) {
      const question = checkIn.questions[i];
      let answer;

      if (question.type === 'radio') {
        answer = question.options[0]; // Select first option
      } else if (question.type === 'checkbox') {
        answer = [question.options[0], question.options[1]]; // Select first two options
      }

      await this.answerQuestion(checkIn.id, i, answer, 'Test explanation');
      console.log(`✓ Answered question ${i + 1}`);
    }

    // 3. Complete check-in
    const result = await this.completeCheckIn(checkIn.id);
    console.log('✓ Completed check-in');

    // 4. Get generated cards
    const cards = await this.cardService.getCardsByCheckIn(checkIn.id);
    console.log(`✓ Generated ${cards.length} health cards`);

    return {
      checkIn: result,
      cards
    };
  }
}

// Export singleton instance for convenience
export const testClient = new TotalisTestClient();

// Export types
export * from './types';
export * from './services';