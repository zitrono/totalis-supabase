// Type definitions for Totalis test client

export interface User {
  id: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  date_of_birth: string;
  sex: 'male' | 'female' | 'other';
  coach_id: string;
  created_at: string;
  updated_at: string;
}

export interface Coach {
  id: string;
  name: string;
  avatar_url?: string;
  voice_id?: string;
  prompt: string;
  is_active: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  coach_id: string;
  role: 'user' | 'assistant' | 'system' | 'preassistant';
  content: string;
  answer_options?: {
    type: 'checkbox' | 'radio';
    options: string[];
  };
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id?: string;
  icon_name: string;
  primary_color: string;
  secondary_color: string;
  order_index: number;
  created_at: string;
}

export interface UserCategory {
  id: string;
  user_id: string;
  category_id: string;
  progress: number; // 0-100
  is_favorite: boolean;
  is_shortcut: boolean;
  last_checkin_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  category_id?: string;
  status: 'in_progress' | 'completed' | 'aborted';
  questions: CheckInQuestion[];
  summary?: string;
  insight?: string;
  brief?: string;
  level?: number;
  created_at: string;
  completed_at?: string;
}

export interface CheckInQuestion {
  id: string;
  question: string;
  type: 'radio' | 'checkbox';
  options: string[];
  answer?: string | string[];
  explanation?: string;
}

export interface HealthCard {
  id: string;
  user_id: string;
  category_id: string;
  checkin_id: string;
  type: 1 | 2; // 1: action recommendation, 2: category insight
  title: string;
  content: string;
  importance: number;
  is_checked: boolean;
  expires_at: string;
  created_at: string;
}

export interface Recommendation {
  id: string;
  user_id: string;
  category_id: string;
  type: 'action' | 'category';
  title: string;
  description: string;
  importance: number;
  is_completed: boolean;
  expires_at?: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
}

// Request types
export interface CreateUserProfileRequest {
  name: string;
  dateOfBirth: Date;
  sex: 'male' | 'female' | 'other';
  coachId?: string;
}

export interface VoiceTranscription {
  id?: string;
  user_id: string;
  file_path: string;
  file_size: number;
  duration_seconds: number;
  transcription: string;
  context_type?: string;
  context_id?: string;
  file_url?: string;
  created_at: string;
}

export interface SendMessageRequest {
  content: string;
  role?: 'user';
}

export interface AnswerQuestionRequest {
  questionIndex: number;
  answer: string | string[];
  explanation?: string;
}

// Service response types
export interface AuthResponse {
  user: User;
  session: any;
}

export interface CheckInResponse {
  checkIn: CheckIn;
  cards?: HealthCard[];
}

// Test scenarios
export interface TestScenario {
  name: string;
  description: string;
  steps: TestStep[];
}

export interface TestStep {
  action: string;
  params?: any;
  expectedResult?: any;
  validate?: (result: any) => boolean;
}

// Scenario types
export interface ScenarioResult {
  success: boolean;
  logs: string[];
  error?: string;
}

export interface TestUser {
  user: User;
  session?: any;
}