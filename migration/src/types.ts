// Production types
export interface ProductionCoach {
  id: number
  name: string
  description: string
  image_id: number
  image30_id: number
  image45_id: number
  image60_id: number
  sex: string
  intro: string
  prompt: string
  time_create: Date
}

export interface ProductionCategory {
  id: number
  parent_id: number | null
  name: string
  name_short: string
  description: string
  icon_id: number
  icon_id_secondary: number
  sort_order: number
  primary_color: string
  secondary_color: string
  show_checkin_history: boolean
  checkin_enabled: boolean
  followup_chat_enabled: boolean
  followup_timer: number
  prompt_checkin: string
  prompt_checkin_2: string
  guidelines_file_text: string
  max_questions: number
  scope: string
  time_create: Date
}

export interface ProductionPrompt {
  id: number
  name: string
  prompt: string
  time_create: Date
}

export interface ProductionVariable {
  id: number
  name: string
  value: string
  user: boolean
  time_create: Date
}

export interface ProductionSystem {
  id: number
  name: string
  value: string
  time_create: Date
}

export interface ProductionImage {
  id: number
  extension: string
  data: Buffer
  time_create: Date
}

// Supabase types
export interface SupabaseCoach {
  id: string
  name: string
  bio: string
  photo_url: string | null
  sex: 'male' | 'female' | 'non_binary' | 'other'
  year_of_birth: number | null
  is_active: boolean
  voice_id: string | null
  voice_settings: any
  created_at: string
}

export interface SupabaseCategory {
  id: string
  parent_id: string | null
  name: string
  name_short: string | null
  description: string | null
  icon: string | null
  sort_order: number
  primary_color: string | null
  secondary_color: string | null
  is_active: boolean
  show_checkin_history: boolean
  checkin_enabled: boolean
  followup_timer: number | null
  prompt_checkin: string | null
  prompt_checkin_2: string | null
  guidelines_file_text: string | null
  max_questions: number | null
  scope: string | null
  created_at: string
}

export interface SupabaseAppConfig {
  key: string
  value: any
  description: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

// Migration result types
export interface MigrationResult {
  success: boolean
  recordsProcessed: number
  recordsMigrated: number
  errors: string[]
  warnings: string[]
}

export interface ImageMigrationResult {
  originalId: number
  fileName: string
  publicUrl: string
  size: 'main' | '30' | '45' | '60'
}

export interface ValidationResult {
  table: string
  test: string
  passed: boolean
  expected: number | string
  actual: number | string
  details?: string
}