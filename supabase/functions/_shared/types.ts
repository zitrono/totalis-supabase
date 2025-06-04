// Shared types for Edge Functions

export interface UserContext {
  user_id: string;
  coach_id: string;
  recent_categories: string[];
  check_in_history: CheckIn[];
}

export interface CheckIn {
  id: string;
  user_id: string;
  category_id: string;
  status: "in_progress" | "completed" | "abandoned";
  started_at: string;
  completed_at?: string;
  responses?: CheckInResponse[];
}

export interface CheckInResponse {
  question_id: string;
  question: string;
  answer: string;
  timestamp: string;
}

export interface Recommendation {
  id?: string;
  user_id: string;
  title: string;
  insight: string;
  why: string;
  action: string;
  category_id: string;
  importance: number;
  relevance: string;
  created_at?: string;
}

export interface ChatMessage {
  id?: string;
  user_id: string;
  message: string;
  is_user: boolean;
  timestamp: string;
  context_type?: "category" | "checkin" | "recommendation";
  context_id?: string;
}

export interface AnalyticsSummary {
  user_id: string;
  period: "week" | "month" | "all";
  total_check_ins: number;
  completed_check_ins: number;
  top_categories: CategoryStat[];
  streak_days: number;
  insights: string[];
}

export interface CategoryStat {
  category_id: string;
  category_name: string;
  count: number;
  last_used: string;
}

export interface LangflowRequest {
  prompt: string;
  context: Record<string, any>;
  type: "recommendation" | "checkin" | "chat" | "analytics";
}

export interface LangflowResponse {
  result: any;
  metadata?: Record<string, any>;
}
