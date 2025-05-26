// Shared types for Edge Functions

export interface UserContext {
  userId: string;
  coachId: string;
  recentCategories: string[];
  checkInHistory: CheckIn[];
}

export interface CheckIn {
  id: string;
  userId: string;
  categoryId: string;
  status: "in_progress" | "completed" | "abandoned";
  startedAt: string;
  completedAt?: string;
  responses?: CheckInResponse[];
}

export interface CheckInResponse {
  questionId: string;
  question: string;
  answer: string;
  timestamp: string;
}

export interface Recommendation {
  id?: string;
  userId: string;
  title: string;
  insight: string;
  why: string;
  action: string;
  categoryId: string;
  importance: number;
  relevance: string;
  createdAt?: string;
}

export interface ChatMessage {
  id?: string;
  userId: string;
  message: string;
  isUser: boolean;
  timestamp: string;
  contextType?: "category" | "checkin" | "recommendation";
  contextId?: string;
}

export interface AnalyticsSummary {
  userId: string;
  period: "week" | "month" | "all";
  totalCheckIns: number;
  completedCheckIns: number;
  topCategories: CategoryStat[];
  streakDays: number;
  insights: string[];
}

export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  count: number;
  lastUsed: string;
}

export interface LangflowRequest {
  prompt: string;
  // deno-lint-ignore no-explicit-any
  context: Record<string, any>;
  type: "recommendation" | "checkin" | "chat" | "analytics";
}

export interface LangflowResponse {
  // deno-lint-ignore no-explicit-any
  result: any;
  // deno-lint-ignore no-explicit-any
  metadata?: Record<string, any>;
}

export interface CheckInQuestion {
  question: string;
  questionNumber: number;
  totalQuestions: number;
  isComplete: boolean;
  responseType: 'scale' | 'text' | 'choice';
}

export interface AIResponse {
  text: string;
  suggestions: string[];
  confidence: number;
  processingTimeMs: number;
  coachPersonality: string;
  followUp: boolean;
}

export interface CheckInSummary {
  wellnessLevel: number;
  insights: string[];
  summary: string;
  recommendations: string[];
  improvementTips: string[];
  nextCheckInSuggestion: string;
}
