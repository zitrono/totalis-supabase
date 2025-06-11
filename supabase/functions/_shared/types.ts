// Shared types for Edge Functions
// These are temporary types until Langflow integration is complete

export interface LangflowQuestionResponse {
  questions: Array<{
    text: string
    type: 'text' | 'scale' | 'radio' | 'checkbox'
    options?: string[]
    scale_min?: number
    scale_max?: number
  }>
  session_id: string
}

export interface LangflowCheckinResponse {
  next_question?: {
    text: string
    type: 'text' | 'scale' | 'radio' | 'checkbox'
    options?: string[]
    scale_min?: number
    scale_max?: number
  }
  is_complete: boolean
  summary?: string
  insight?: string
  wellness_level?: number
  recommendations?: Array<{
    type: 'first' | 'second'
    title?: string
    action?: string
    insight?: string
    why?: string
    importance: number
    relevance?: string
    recommended_categories?: string[]
  }>
}

export interface LangflowChatResponse {
  response: string
  metadata?: {
    tokens_used?: number
    model?: string
    coach_personality?: string
  }
  suggested_actions?: Array<{
    type: string
    category_id?: string
    action_text?: string
  }>
}

export interface LangflowProposalResponse {
  proposal: {
    category_id: string
    category_name: string
    rationale: string
    urgency: 'low' | 'medium' | 'high'
    personalized_message: string
  }
  metadata?: {
    analysis_factors: string[]
    confidence_score: number
  }
}
