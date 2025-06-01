export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analytics_events: {
        Row: {
          app_version: string | null
          created_at: string | null
          device_info: Json | null
          event_category: string | null
          event_name: string
          event_properties: Json | null
          id: string
          platform: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          device_info?: Json | null
          event_category?: string | null
          event_name: string
          event_properties?: Json | null
          id?: string
          platform?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          device_info?: Json | null
          event_category?: string | null
          event_name?: string
          event_properties?: Json | null
          id?: string
          platform?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      app_config: {
        Row: {
          created_at: string | null
          description: string | null
          is_public: boolean | null
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          is_public?: boolean | null
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          is_public?: boolean | null
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          build_number: number
          created_at: string | null
          id: string
          is_active: boolean | null
          is_required_update: boolean | null
          minimum_supported: boolean | null
          platform: string
          release_notes: string | null
          released_at: string
          version_number: string
        }
        Insert: {
          build_number: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_required_update?: boolean | null
          minimum_supported?: boolean | null
          platform: string
          release_notes?: string | null
          released_at: string
          version_number: string
        }
        Update: {
          build_number?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_required_update?: boolean | null
          minimum_supported?: boolean | null
          platform?: string
          release_notes?: string | null
          released_at?: string
          version_number?: string
        }
        Relationships: []
      }
      audio_transcriptions: {
        Row: {
          created_at: string | null
          duration: number | null
          filename: string | null
          id: string
          language: string | null
          metadata: Json | null
          transcription: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          filename?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          transcription: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          filename?: string | null
          id?: string
          language?: string | null
          metadata?: Json | null
          transcription?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_transcriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      audio_usage_logs: {
        Row: {
          created_at: string | null
          file_size: number
          id: string
          mime_type: string
          processing_time_ms: number
          request_id: string
          success: boolean
          transcription_length: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_size: number
          id?: string
          mime_type: string
          processing_time_ms: number
          request_id: string
          success?: boolean
          transcription_length: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_size?: number
          id?: string
          mime_type?: string
          processing_time_ms?: number
          request_id?: string
          success?: boolean
          transcription_length?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      categories: {
        Row: {
          checkin_enabled: boolean | null
          created_at: string | null
          description: string | null
          followup_chat_enabled: boolean | null
          followup_timer: number | null
          guidelines_file_text: string | null
          icon: string | null
          icon_secondary_url: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          max_questions: number | null
          metadata: Json | null
          name: string
          name_short: string | null
          parent_id: string | null
          primary_color: string | null
          prompt_checkin: string | null
          prompt_checkin_2: string | null
          prompt_followup: string | null
          scope: string | null
          secondary_color: string | null
          show_checkin_history: boolean | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          checkin_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          followup_chat_enabled?: boolean | null
          followup_timer?: number | null
          guidelines_file_text?: string | null
          icon?: string | null
          icon_secondary_url?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          max_questions?: number | null
          metadata?: Json | null
          name: string
          name_short?: string | null
          parent_id?: string | null
          primary_color?: string | null
          prompt_checkin?: string | null
          prompt_checkin_2?: string | null
          prompt_followup?: string | null
          scope?: string | null
          secondary_color?: string | null
          show_checkin_history?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          checkin_enabled?: boolean | null
          created_at?: string | null
          description?: string | null
          followup_chat_enabled?: boolean | null
          followup_timer?: number | null
          guidelines_file_text?: string | null
          icon?: string | null
          icon_secondary_url?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          max_questions?: number | null
          metadata?: Json | null
          name?: string
          name_short?: string | null
          parent_id?: string | null
          primary_color?: string | null
          prompt_checkin?: string | null
          prompt_checkin_2?: string | null
          prompt_followup?: string | null
          scope?: string | null
          secondary_color?: string | null
          show_checkin_history?: boolean | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          brief: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          insight: string | null
          level: number | null
          questions: Json
          status: string | null
          summary: string | null
          user_id: string
        }
        Insert: {
          brief?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          insight?: string | null
          level?: number | null
          questions?: Json
          status?: string | null
          summary?: string | null
          user_id: string
        }
        Update: {
          brief?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          insight?: string | null
          level?: number | null
          questions?: Json
          status?: string | null
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      checkin_answers: {
        Row: {
          answer: string
          answered_at: string
          checkin_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          question_id: string
        }
        Insert: {
          answer: string
          answered_at?: string
          checkin_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          question_id: string
        }
        Update: {
          answer?: string
          answered_at?: string
          checkin_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_answers_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkin_history_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_answers_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_answers_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkins_with_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_progress: {
        Row: {
          answers: Json | null
          checkin_id: string
          created_at: string | null
          current_question_index: number | null
          id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          checkin_id: string
          created_at?: string | null
          current_question_index?: number | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          checkin_id?: string
          created_at?: string | null
          current_question_index?: number | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_progress_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkin_history_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_progress_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_progress_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkins_with_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      checkin_templates: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean | null
          questions: Json
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          questions?: Json
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          questions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          brief: string | null
          category_id: string | null
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          current_question: number | null
          id: string
          insight: string | null
          insights: string | null
          metadata: Json | null
          mood: Json | null
          questions_asked: number | null
          responses: Json | null
          started_at: string | null
          status: string
          summary: string | null
          total_questions: number | null
          updated_at: string | null
          user_category_id: string | null
          user_id: string
          wellness_level: number | null
        }
        Insert: {
          brief?: string | null
          category_id?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          current_question?: number | null
          id?: string
          insight?: string | null
          insights?: string | null
          metadata?: Json | null
          mood?: Json | null
          questions_asked?: number | null
          responses?: Json | null
          started_at?: string | null
          status?: string
          summary?: string | null
          total_questions?: number | null
          updated_at?: string | null
          user_category_id?: string | null
          user_id: string
          wellness_level?: number | null
        }
        Update: {
          brief?: string | null
          category_id?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          current_question?: number | null
          id?: string
          insight?: string | null
          insights?: string | null
          metadata?: Json | null
          mood?: Json | null
          questions_asked?: number | null
          responses?: Json | null
          started_at?: string | null
          status?: string
          summary?: string | null
          total_questions?: number | null
          updated_at?: string | null
          user_category_id?: string | null
          user_id?: string
          wellness_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      coaches: {
        Row: {
          avatar_sizes: Json | null
          bio: string | null
          created_at: string | null
          id: string
          image_large_url: string | null
          image_medium_url: string | null
          image_small_url: string | null
          image_url: string | null
          is_active: boolean | null
          metadata: Json | null
          name: string
          photo_url: string | null
          prompt: string | null
          sex: string | null
          system_prompt: string | null
          updated_at: string | null
          voice: string | null
          voice_id: string | null
          voice_settings: Json | null
          year_of_birth: number | null
        }
        Insert: {
          avatar_sizes?: Json | null
          bio?: string | null
          created_at?: string | null
          id?: string
          image_large_url?: string | null
          image_medium_url?: string | null
          image_small_url?: string | null
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          photo_url?: string | null
          prompt?: string | null
          sex?: string | null
          system_prompt?: string | null
          updated_at?: string | null
          voice?: string | null
          voice_id?: string | null
          voice_settings?: Json | null
          year_of_birth?: number | null
        }
        Update: {
          avatar_sizes?: Json | null
          bio?: string | null
          created_at?: string | null
          id?: string
          image_large_url?: string | null
          image_medium_url?: string | null
          image_small_url?: string | null
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          photo_url?: string | null
          prompt?: string | null
          sex?: string | null
          system_prompt?: string | null
          updated_at?: string | null
          voice?: string | null
          voice_id?: string | null
          voice_settings?: Json | null
          year_of_birth?: number | null
        }
        Relationships: []
      }
      health_cards: {
        Row: {
          category_id: string | null
          checkin_id: string | null
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          importance: number | null
          is_checked: boolean | null
          title: string
          type: number
          user_id: string
        }
        Insert: {
          category_id?: string | null
          checkin_id?: string | null
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          is_checked?: boolean | null
          title: string
          type: number
          user_id: string
        }
        Update: {
          category_id?: string | null
          checkin_id?: string | null
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          is_checked?: boolean | null
          title?: string
          type?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_cards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_cards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_cards_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "check_ins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      image_migrations: {
        Row: {
          bucket: string
          id: string
          migrated_at: string | null
          new_url: string
          old_image_id: number | null
          path: string
        }
        Insert: {
          bucket: string
          id?: string
          migrated_at?: string | null
          new_url: string
          old_image_id?: number | null
          path: string
        }
        Update: {
          bucket?: string
          id?: string
          migrated_at?: string | null
          new_url?: string
          old_image_id?: number | null
          path?: string
        }
        Relationships: []
      }
      message_threads: {
        Row: {
          category_id: string
          coach_id: string | null
          created_at: string
          id: string
          is_archived: boolean | null
          last_message_at: string | null
          message_count: number | null
          metadata: Json | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          coach_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          coach_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mobile_user_dashboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_normalized"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_normalized"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "message_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_with_coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ai_processed: boolean | null
          ai_response_time_ms: number | null
          answer_options: Json | null
          category_id: string | null
          coach_id: string | null
          content: string
          content_type: string | null
          conversation_id: string | null
          created_at: string | null
          duration_seconds: number | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          is_read: boolean | null
          message_order: number | null
          message_type: string | null
          metadata: Json | null
          parent_message_id: string | null
          read_at: string | null
          ref_category_id: string | null
          ref_checkin_id: string | null
          ref_recommendation_id: string | null
          reply_to_id: string | null
          role: string
          thread_id: string | null
          tokens_used: number | null
          user_id: string
          voice_url: string | null
        }
        Insert: {
          ai_processed?: boolean | null
          ai_response_time_ms?: number | null
          answer_options?: Json | null
          category_id?: string | null
          coach_id?: string | null
          content: string
          content_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_read?: boolean | null
          message_order?: number | null
          message_type?: string | null
          metadata?: Json | null
          parent_message_id?: string | null
          read_at?: string | null
          ref_category_id?: string | null
          ref_checkin_id?: string | null
          ref_recommendation_id?: string | null
          reply_to_id?: string | null
          role: string
          thread_id?: string | null
          tokens_used?: number | null
          user_id: string
          voice_url?: string | null
        }
        Update: {
          ai_processed?: boolean | null
          ai_response_time_ms?: number | null
          answer_options?: Json | null
          category_id?: string | null
          coach_id?: string | null
          content?: string
          content_type?: string | null
          conversation_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_read?: boolean | null
          message_order?: number | null
          message_type?: string | null
          metadata?: Json | null
          parent_message_id?: string | null
          read_at?: string | null
          ref_category_id?: string | null
          ref_checkin_id?: string | null
          ref_recommendation_id?: string | null
          reply_to_id?: string | null
          role?: string
          thread_id?: string | null
          tokens_used?: number | null
          user_id?: string
          voice_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages_with_coach"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "user_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages_with_coach"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "user_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      offline_queue: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          operation_type: string
          payload: Json
          retry_count: number | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          operation_type: string
          payload: Json
          retry_count?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          operation_type?: string
          payload?: Json
          retry_count?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offline_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profile_categories: {
        Row: {
          average_wellness_level: number | null
          category_id: string
          checkin_count: number | null
          created_at: string | null
          id: string
          is_favorite: boolean | null
          is_shortcut: boolean | null
          last_checkin_at: string | null
          metadata: Json | null
          progress: number | null
          total_checkins: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_wellness_level?: number | null
          category_id: string
          checkin_count?: number | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          is_shortcut?: boolean | null
          last_checkin_at?: string | null
          metadata?: Json | null
          progress?: number | null
          total_checkins?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_wellness_level?: number | null
          category_id?: string
          checkin_count?: number | null
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          is_shortcut?: boolean | null
          last_checkin_at?: string | null
          metadata?: Json | null
          progress?: number | null
          total_checkins?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          birth_year: number | null
          coach: Json | null
          coach_id: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          image_url: string | null
          is_tester: boolean | null
          language_code: string | null
          last_login: string | null
          last_name: string | null
          last_seen_at: string | null
          metadata: Json | null
          mood_config: Json | null
          name: string | null
          notification_settings: Json | null
          phone_number: string | null
          sex: string | null
          summarization_enabled: boolean | null
          timezone: string | null
          updated_at: string | null
          voice_enabled: boolean | null
          year_of_birth: number | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          birth_year?: number | null
          coach?: Json | null
          coach_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          image_url?: string | null
          is_tester?: boolean | null
          language_code?: string | null
          last_login?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          metadata?: Json | null
          mood_config?: Json | null
          name?: string | null
          notification_settings?: Json | null
          phone_number?: string | null
          sex?: string | null
          summarization_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          voice_enabled?: boolean | null
          year_of_birth?: number | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          birth_year?: number | null
          coach?: Json | null
          coach_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          image_url?: string | null
          is_tester?: boolean | null
          language_code?: string | null
          last_login?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          metadata?: Json | null
          mood_config?: Json | null
          name?: string | null
          notification_settings?: Json | null
          phone_number?: string | null
          sex?: string | null
          summarization_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          voice_enabled?: boolean | null
          year_of_birth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      recommendations: {
        Row: {
          action: string | null
          category_id: string | null
          checkin_message_id: string | null
          context: string | null
          created_at: string | null
          dismissed_at: string | null
          expires_at: string | null
          id: string
          importance: number | null
          is_active: boolean | null
          last_viewed_at: string | null
          level: number | null
          metadata: Json | null
          parent_recommendation_id: string | null
          recommendation_text: string
          recommendation_type: string
          recommended_categories: string[] | null
          relevance: number | null
          title: string | null
          updated_at: string | null
          user_id: string
          view_count: number | null
          viewed_at: string | null
          why: string | null
        }
        Insert: {
          action?: string | null
          category_id?: string | null
          checkin_message_id?: string | null
          context?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          is_active?: boolean | null
          last_viewed_at?: string | null
          level?: number | null
          metadata?: Json | null
          parent_recommendation_id?: string | null
          recommendation_text: string
          recommendation_type: string
          recommended_categories?: string[] | null
          relevance?: number | null
          title?: string | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
          viewed_at?: string | null
          why?: string | null
        }
        Update: {
          action?: string | null
          category_id?: string | null
          checkin_message_id?: string | null
          context?: string | null
          created_at?: string | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          importance?: number | null
          is_active?: boolean | null
          last_viewed_at?: string | null
          level?: number | null
          metadata?: Json | null
          parent_recommendation_id?: string | null
          recommendation_text?: string
          recommendation_type?: string
          recommended_categories?: string[] | null
          relevance?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
          viewed_at?: string | null
          why?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_checkin_message_id_fkey"
            columns: ["checkin_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_checkin_message_id_fkey"
            columns: ["checkin_message_id"]
            isOneToOne: false
            referencedRelation: "messages_with_coach"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_checkin_message_id_fkey"
            columns: ["checkin_message_id"]
            isOneToOne: false
            referencedRelation: "user_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "active_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "mobile_recommendations_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      test_cicd_verification: {
        Row: {
          id: string
          metadata: Json | null
          test_name: string
          test_timestamp: string | null
        }
        Insert: {
          id?: string
          metadata?: Json | null
          test_name: string
          test_timestamp?: string | null
        }
        Update: {
          id?: string
          metadata?: Json | null
          test_name?: string
          test_timestamp?: string | null
        }
        Relationships: []
      }
      user_app_versions: {
        Row: {
          device_model: string | null
          id: string
          installed_at: string | null
          last_opened_at: string | null
          os_version: string | null
          user_id: string
          version_id: string
        }
        Insert: {
          device_model?: string | null
          id?: string
          installed_at?: string | null
          last_opened_at?: string | null
          os_version?: string | null
          user_id: string
          version_id: string
        }
        Update: {
          device_model?: string | null
          id?: string
          installed_at?: string | null
          last_opened_at?: string | null
          os_version?: string | null
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_app_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_app_versions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "app_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_categories: {
        Row: {
          category_id: string
          created_at: string
          is_favorite: boolean | null
          is_subscribed: boolean | null
          last_interaction_at: string | null
          metadata: Json | null
          notification_enabled: boolean | null
          settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          is_favorite?: boolean | null
          is_subscribed?: boolean | null
          last_interaction_at?: string | null
          metadata?: Json | null
          notification_enabled?: boolean | null
          settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          is_favorite?: boolean | null
          is_subscribed?: boolean | null
          last_interaction_at?: string | null
          metadata?: Json | null
          notification_enabled?: boolean | null
          settings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_categories_category_id_fkey1"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_categories_category_id_fkey1"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_categories_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mobile_user_dashboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_categories_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_categories_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_normalized"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_categories_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_normalized"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_categories_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles_with_coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          created_at: string | null
          device_token: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          platform: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_token: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          platform: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_token?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          platform?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          content: string | null
          context: Json | null
          created_at: string | null
          feedback_type: string
          health_card_id: string | null
          id: string
          is_processed: boolean | null
          message_id: string | null
          processed_at: string | null
          rating: number | null
          recommendation_id: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          context?: Json | null
          created_at?: string | null
          feedback_type: string
          health_card_id?: string | null
          id?: string
          is_processed?: boolean | null
          message_id?: string | null
          processed_at?: string | null
          rating?: number | null
          recommendation_id?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          context?: Json | null
          created_at?: string | null
          feedback_type?: string
          health_card_id?: string | null
          id?: string
          is_processed?: boolean | null
          message_id?: string | null
          processed_at?: string | null
          rating?: number | null
          recommendation_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_health_card_id_fkey"
            columns: ["health_card_id"]
            isOneToOne: false
            referencedRelation: "health_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages_with_coach"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "user_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "active_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "mobile_recommendations_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      voice_transcriptions: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string | null
          duration_seconds: number | null
          file_path: string
          file_size: number
          id: string
          transcription: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          file_path: string
          file_size: number
          id?: string
          transcription: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          file_path?: string
          file_size?: number
          id?: string
          transcription?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_transcriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      active_recommendations: {
        Row: {
          action: string | null
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          checkin_message_id: string | null
          context: string | null
          created_at: string | null
          dismissed_at: string | null
          id: string | null
          importance: number | null
          is_active: boolean | null
          metadata: Json | null
          parent_recommendation_id: string | null
          recommendation_text: string | null
          recommendation_type: string | null
          recommended_categories: string[] | null
          relevance: number | null
          title: string | null
          user_id: string | null
          viewed_at: string | null
          why: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_checkin_message_id_fkey"
            columns: ["checkin_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_checkin_message_id_fkey"
            columns: ["checkin_message_id"]
            isOneToOne: false
            referencedRelation: "messages_with_coach"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_checkin_message_id_fkey"
            columns: ["checkin_message_id"]
            isOneToOne: false
            referencedRelation: "user_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "active_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "mobile_recommendations_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_audio_analytics: {
        Row: {
          avg_file_size_mb: number | null
          avg_processing_time_ms: number | null
          failed_requests: number | null
          hour: string | null
          max_processing_time_ms: number | null
          successful_requests: number | null
          total_bytes_processed: number | null
          total_characters_transcribed: number | null
          total_requests: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      categories_with_user_preferences: {
        Row: {
          added_at: string | null
          checkin_enabled: boolean | null
          created_at: string | null
          description: string | null
          followup_timer: number | null
          guidelines_file_text: string | null
          icon: string | null
          icon_secondary_url: string | null
          icon_url: string | null
          id: string | null
          is_active: boolean | null
          is_favorite: boolean | null
          is_selected: boolean | null
          max_questions: number | null
          metadata: Json | null
          name: string | null
          name_short: string | null
          parent_id: string | null
          primary_color: string | null
          prompt_checkin: string | null
          prompt_checkin_2: string | null
          scope: string | null
          secondary_color: string | null
          show_checkin_history: boolean | null
          sort_order: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      checkin_analytics: {
        Row: {
          avg_wellness_level: number | null
          category_id: string | null
          category_name: string | null
          first_checkin: string | null
          last_checkin: string | null
          total_checkins: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      checkin_history_view: {
        Row: {
          brief: string | null
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          current_question: number | null
          id: string | null
          insight: string | null
          insights: string | null
          metadata: Json | null
          mood: Json | null
          questions_asked: number | null
          responses: Json | null
          started_at: string | null
          status: string | null
          summary: string | null
          total_questions: number | null
          updated_at: string | null
          user_category_id: string | null
          user_id: string | null
          wellness_level: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      checkins_with_answers: {
        Row: {
          answer_count: number | null
          answers: Json[] | null
          brief: string | null
          category_id: string | null
          category_name: string | null
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          current_question: number | null
          id: string | null
          insight: string | null
          insights: string | null
          metadata: Json | null
          mood: Json | null
          questions_asked: number | null
          responses: Json | null
          started_at: string | null
          status: string | null
          summary: string | null
          total_questions: number | null
          updated_at: string | null
          user_category_id: string | null
          user_id: string | null
          wellness_level: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages_with_coach: {
        Row: {
          ai_processed: boolean | null
          ai_response_time_ms: number | null
          answer_options: Json | null
          category_id: string | null
          coach_id: string | null
          content: string | null
          content_type: string | null
          conversation_id: string | null
          created_at: string | null
          id: string | null
          is_read: boolean | null
          message_order: number | null
          metadata: Json | null
          parent_message_id: string | null
          ref_category_id: string | null
          ref_checkin_id: string | null
          ref_recommendation_id: string | null
          role: string | null
          sender_avatar: string | null
          sender_name: string | null
          tokens_used: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages_with_coach"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "user_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mobile_recommendations_feed: {
        Row: {
          action: string | null
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          id: string | null
          importance: number | null
          is_active: boolean | null
          recommendation_text: string | null
          recommendation_type: string | null
          relevance: number | null
          title: string | null
          user_id: string | null
          why: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mobile_user_dashboard: {
        Row: {
          active_recommendations: number | null
          coach_id: string | null
          coach_image: string | null
          coach_name: string | null
          completed_checkins: number | null
          first_name: string | null
          last_name: string | null
          member_since: string | null
          profile_image: string | null
          unread_messages: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profile_categories_detailed: {
        Row: {
          average_wellness_level: number | null
          category_description: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          category_name_short: string | null
          checkin_count: number | null
          checkin_enabled: boolean | null
          created_at: string | null
          id: string | null
          is_favorite: boolean | null
          is_shortcut: boolean | null
          last_checkin_at: string | null
          max_questions: number | null
          primary_color: string | null
          progress: number | null
          secondary_color: string | null
          total_checkins: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      recommendations_active: {
        Row: {
          action: string | null
          category_color: string | null
          category_icon: string | null
          category_id: string | null
          category_name: string | null
          checkin_message_id: string | null
          context: string | null
          created_at: string | null
          dismissed_at: string | null
          expires_at: string | null
          id: string | null
          importance: number | null
          is_active: boolean | null
          metadata: Json | null
          parent_recommendation_id: string | null
          recommendation_text: string | null
          recommendation_type: string | null
          recommended_categories: string[] | null
          relevance: number | null
          title: string | null
          user_id: string | null
          viewed_at: string | null
          why: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_checkin_message_id_fkey"
            columns: ["checkin_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_checkin_message_id_fkey"
            columns: ["checkin_message_id"]
            isOneToOne: false
            referencedRelation: "messages_with_coach"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_checkin_message_id_fkey"
            columns: ["checkin_message_id"]
            isOneToOne: false
            referencedRelation: "user_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "active_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "mobile_recommendations_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      recommendations_with_children: {
        Row: {
          action: string | null
          category_id: string | null
          checkin_message_id: string | null
          children: Json | null
          context: string | null
          created_at: string | null
          dismissed_at: string | null
          expires_at: string | null
          id: string | null
          importance: number | null
          is_active: boolean | null
          last_viewed_at: string | null
          level: number | null
          metadata: Json | null
          parent_recommendation_id: string | null
          recommendation_text: string | null
          recommendation_type: string | null
          recommended_categories: string[] | null
          relevance: number | null
          title: string | null
          user_id: string | null
          view_count: number | null
          viewed_at: string | null
          why: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_checkin_message_id_fkey"
            columns: ["checkin_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_checkin_message_id_fkey"
            columns: ["checkin_message_id"]
            isOneToOne: false
            referencedRelation: "messages_with_coach"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_checkin_message_id_fkey"
            columns: ["checkin_message_id"]
            isOneToOne: false
            referencedRelation: "user_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "active_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "mobile_recommendations_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations_active"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_parent_recommendation_id_fkey"
            columns: ["parent_recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations_with_children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_audio_analytics: {
        Row: {
          avg_processing_time_ms: number | null
          avg_transcription_length: number | null
          date: string | null
          failed_requests: number | null
          successful_requests: number | null
          total_bytes_processed: number | null
          total_characters_transcribed: number | null
          total_requests: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_checkins: {
        Row: {
          brief: string | null
          category_id: string | null
          category_name: string | null
          checkin_count: number | null
          created_at: string | null
          id: string | null
          insight: string | null
          mood: Json | null
          summary: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories_with_user_preferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_profiles_normalized: {
        Row: {
          birth_year: number | null
          coach_id: string | null
          created_at: string | null
          email: string | null
          gender: string | null
          gender_raw: string | null
          id: string | null
          image_url: string | null
          metadata: Json | null
          name: string | null
          phone_number: string | null
          updated_at: string | null
          user_id: string | null
          year_of_birth: number | null
        }
        Insert: {
          birth_year?: number | null
          coach_id?: string | null
          created_at?: string | null
          email?: string | null
          gender?: never
          gender_raw?: string | null
          id?: string | null
          image_url?: string | null
          metadata?: Json | null
          name?: string | null
          phone_number?: string | null
          updated_at?: string | null
          user_id?: string | null
          year_of_birth?: number | null
        }
        Update: {
          birth_year?: number | null
          coach_id?: string | null
          created_at?: string | null
          email?: string | null
          gender?: never
          gender_raw?: string | null
          id?: string | null
          image_url?: string | null
          metadata?: Json | null
          name?: string | null
          phone_number?: string | null
          updated_at?: string | null
          user_id?: string | null
          year_of_birth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_profiles_with_coaches: {
        Row: {
          avatar_url: string | null
          coach: Json | null
          coach_avatar: string | null
          coach_bio: string | null
          coach_id: string | null
          coach_name: string | null
          coach_sex: string | null
          coach_year_of_birth: number | null
          created_at: string | null
          id: string | null
          language_code: string | null
          metadata: Json | null
          mood_config: Json | null
          name: string | null
          notification_settings: Json | null
          sex: string | null
          timezone: string | null
          updated_at: string | null
          voice_enabled: boolean | null
          year_of_birth: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_stats: {
        Row: {
          active_cards: number | null
          categories_used: number | null
          completed_checkins: number | null
          favorite_categories: number | null
          last_activity: string | null
          total_checkins: number | null
          total_messages: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      batch_create_messages: {
        Args: { messages_data: Json }
        Returns: Json
      }
      check_email_exists: {
        Args: { email_param: string }
        Returns: boolean
      }
      clean_test_data: {
        Args: { p_older_than?: unknown; p_dry_run?: boolean }
        Returns: Json
      }
      cleanup_old_voice_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      complete_checkin: {
        Args: {
          p_checkin_id: string
          p_summary: string
          p_insight: string
          p_brief: string
          p_level: number
        }
        Returns: string
      }
      complete_voice_upload: {
        Args: {
          p_message_id: string
          p_voice_url: string
          p_voice_duration: number
          p_transcription?: string
        }
        Returns: Json
      }
      convert_sex_enum_to_string: {
        Args: { p_sex: string }
        Returns: string
      }
      debug_jwt_claims: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      expire_old_recommendations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_test_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_active_checkin: {
        Args: { user_id_param: string; category_id_param: string }
        Returns: {
          checkin_id: string
          current_question_index: number
          answers: Json
          status: string
          created_at: string
        }[]
      }
      get_active_health_cards: {
        Args: { p_user_id: string }
        Returns: {
          id: string
          category_id: string
          category_name: string
          type: number
          title: string
          content: string
          importance: number
          created_at: string
          expires_at: string
        }[]
      }
      get_category_tree: {
        Args: { p_parent_id?: string }
        Returns: {
          id: string
          parent_id: string
          name: string
          name_short: string
          level: number
          path: string[]
        }[]
      }
      get_conversation_messages: {
        Args: { conversation_uuid: string; user_uuid: string }
        Returns: {
          id: string
          message_text: string
          message_type: string
          coach_id: string
          ref_category_id: string
          ref_checkin_id: string
          ref_recommendation_id: string
          is_read: boolean
          ai_processed: boolean
          ai_response_time_ms: number
          created_at: string
          updated_at: string
        }[]
      }
      get_messages_paginated: {
        Args: {
          p_user_id: string
          p_category_id: string
          p_thread_id?: string
          p_limit?: number
          p_before_timestamp?: string
        }
        Returns: {
          id: string
          content: string
          role: string
          message_type: string
          voice_url: string
          duration_seconds: number
          thread_id: string
          reply_to_id: string
          is_edited: boolean
          edited_at: string
          read_at: string
          created_at: string
          reply_to_content: string
          reply_to_role: string
        }[]
      }
      get_or_create_conversation: {
        Args: { category_id_param?: string; checkin_id_param?: string }
        Returns: string
      }
      get_or_create_thread: {
        Args: {
          p_user_id: string
          p_category_id: string
          p_coach_id?: string
          p_title?: string
        }
        Returns: string
      }
      get_recent_checkins: {
        Args: { category_id_param: string; limit_param?: number }
        Returns: {
          id: string
          wellness_level: number
          brief: string
          insights: string
          created_at: string
        }[]
      }
      get_recommendation_tree: {
        Args: { p_user_id: string; p_category_id: string }
        Returns: {
          id: string
          title: string
          content: string
          level: number
          parent_id: string
          created_at: string
          expires_at: string
          view_count: number
        }[]
      }
      get_storage_url: {
        Args: { bucket: string; object_path: string }
        Returns: string
      }
      get_test_cicd_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          test_name: string
          test_timestamp: string
        }[]
      }
      get_user_audio_usage: {
        Args: { p_user_id: string; p_month?: string }
        Returns: {
          total_requests: number
          successful_requests: number
          total_mb_processed: number
          total_minutes_audio: number
          total_characters: number
          avg_processing_time_ms: number
        }[]
      }
      get_user_categories: {
        Args: { p_user_id: string }
        Returns: {
          category_id: string
          category_name: string
          category_icon_url: string
          is_favorite: boolean
          is_subscribed: boolean
          notification_enabled: boolean
          last_interaction_at: string
          settings: Json
        }[]
      }
      get_user_conversations: {
        Args: { user_uuid: string; limit_count?: number }
        Returns: {
          conversation_id: string
          last_message_at: string
          message_count: number
          unread_count: number
          last_message_text: string
        }[]
      }
      get_user_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_checkins: number
          avg_wellness_level: number
          favorite_categories: number
          active_recommendations: number
          total_messages: number
          days_active: number
        }[]
      }
      get_voice_message_stats: {
        Args: { p_user_id?: string }
        Returns: Json
      }
      is_anonymous_user: {
        Args: { user_id: string }
        Returns: boolean
      }
      log_event: {
        Args: { event_name: string; properties?: Json }
        Returns: undefined
      }
      mark_messages_as_read: {
        Args: { conversation_uuid: string }
        Returns: number
      }
      mark_messages_read: {
        Args:
          | { conversation_id_param: string }
          | {
              p_user_id: string
              p_thread_id: string
              p_until_timestamp?: string
            }
        Returns: number
      }
      merge_anonymous_account: {
        Args: { anonymous_user_id: string; authenticated_user_id: string }
        Returns: undefined
      }
      resume_or_create_checkin: {
        Args: { category_id_param: string; coach_id_param?: string }
        Returns: Json
      }
      retry_offline_operations: {
        Args: { p_user_id?: string; p_limit?: number }
        Returns: Json
      }
      save_checkin_progress: {
        Args: {
          checkin_id_param: string
          question_index_param: number
          answers_param: Json
        }
        Returns: undefined
      }
      test_toggle_category_favorite: {
        Args: { p_user_id: string; p_category_id: string }
        Returns: boolean
      }
      toggle_category_favorite: {
        Args: { p_user_id: string; p_category_id: string }
        Returns: boolean
      }
      toggle_favorite_category: {
        Args: { category_id_param: string }
        Returns: {
          average_wellness_level: number | null
          category_id: string
          checkin_count: number | null
          created_at: string | null
          id: string
          is_favorite: boolean | null
          is_shortcut: boolean | null
          last_checkin_at: string | null
          metadata: Json | null
          progress: number | null
          total_checkins: number | null
          updated_at: string | null
          user_id: string
        }
      }
      update_category_subscription: {
        Args: {
          p_user_id: string
          p_category_id: string
          p_is_subscribed: boolean
          p_notification_enabled?: boolean
        }
        Returns: {
          category_id: string
          created_at: string
          is_favorite: boolean | null
          is_subscribed: boolean | null
          last_interaction_at: string | null
          metadata: Json | null
          notification_enabled: boolean | null
          settings: Json | null
          updated_at: string
          user_id: string
        }
      }
      update_last_seen: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_user_profile_fixed: {
        Args: {
          p_user_id?: string
          p_name?: string
          p_email?: string
          p_phone?: string
          p_birth_year?: number
          p_sex?: string
          p_coach_id?: string
          p_image_url?: string
        }
        Returns: Json
      }
      validate_oauth_params: {
        Args: { p_redirect_url: string; p_platform?: string }
        Returns: boolean
      }
      year_to_birth_date_string: {
        Args: { p_year: number }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
