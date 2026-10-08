export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          bio: string | null
          avatar_url: string | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id: string
          username: string
          display_name: string
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      topics: {
        Row: {
          id: string
          user_id: string
          title: string
          slug: string
          nudge_cooldown_until: string | null
          fts?: any
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          slug: string
          nudge_cooldown_until?: string | null
          fts?: any
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          slug?: string
          nudge_cooldown_until?: string | null
          fts?: any
          created_at?: string
        }
      }
      private_entries: {
        Row: {
          id: string
          topic_id: string
          user_id: string
          content: string
          confidence_rating: number
          shift_reason?: 'empirical_evidence' | 'counter_argument' | 'real_world_event' | 'value_shift' | 'introspective_review' | 'other' | null
          entry_date: string
          created_at?: string
        }
        Insert: {
          id?: string
          topic_id: string
          user_id: string
          content: string
          confidence_rating: number
          shift_reason?: 'empirical_evidence' | 'counter_argument' | 'real_world_event' | 'value_shift' | 'introspective_review' | 'other' | null
          entry_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          topic_id?: string
          user_id?: string
          content?: string
          confidence_rating?: number
          shift_reason?: 'empirical_evidence' | 'counter_argument' | 'real_world_event' | 'value_shift' | 'introspective_review' | 'other' | null
          entry_date?: string
          created_at?: string
        }
      }
      public_posts: {
        Row: {
          id: string
          private_entry_id: string
          topic_id: string
          user_id: string
          content: string
          confidence_rating: number
          shift_reason?: 'empirical_evidence' | 'counter_argument' | 'real_world_event' | 'value_shift' | 'introspective_review' | 'other' | null
          moderation_status: 'pending' | 'approved' | 'flagged' | 'rejected'
          moderation_reason?: string | null
          moderated_at?: string | null
          entry_date: string
          fts?: any
          created_at?: string
        }
        Insert: {
          id?: string
          private_entry_id: string
          topic_id: string
          user_id: string
          content: string
          confidence_rating: number
          shift_reason?: 'empirical_evidence' | 'counter_argument' | 'real_world_event' | 'value_shift' | 'introspective_review' | 'other' | null
          moderation_status?: 'pending' | 'approved' | 'flagged' | 'rejected'
          moderation_reason?: string | null
          moderated_at?: string | null
          entry_date?: string
          fts?: any
          created_at?: string
        }
        Update: {
          id?: string
          private_entry_id?: string
          topic_id?: string
          user_id?: string
          content?: string
          confidence_rating?: number
          shift_reason?: 'empirical_evidence' | 'counter_argument' | 'real_world_event' | 'value_shift' | 'introspective_review' | 'other' | null
          moderation_status?: 'pending' | 'approved' | 'flagged' | 'rejected'
          moderation_reason?: string | null
          moderated_at?: string | null
          entry_date?: string
          fts?: any
          created_at?: string
        }
      }
      entry_revisions: {
        Row: {
          id: string
          entry_id: string
          prior_content: string
          prior_confidence: number
          prior_shift_reason?: string | null
          revised_at: string
          revised_by: string
        }
        Insert: {
          id?: string
          entry_id: string
          prior_content: string
          prior_confidence: number
          prior_shift_reason?: string | null
          revised_at?: string
          revised_by: string
        }
        Update: {
          id?: string
          entry_id?: string
          prior_content?: string
          prior_confidence?: number
          prior_shift_reason?: string | null
          revised_at?: string
          revised_by?: string
        }
      }
      outbox_events: {
        Row: {
          id: string
          event_type: string
          payload: any
          status: 'pending' | 'processing' | 'completed' | 'failed'
          created_at: string
          processed_at?: string | null
        }
        Insert: {
          id?: string
          event_type: string
          payload: any
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          event_type?: string
          payload?: any
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          processed_at?: string | null
        }
      }
      nudges: {
        Row: {
          id: string
          topic_id: string
          nudger_id: string
          created_at: string
        }
        Insert: {
          id?: string
          topic_id: string
          nudger_id: string
          created_at?: string
        }
        Update: {
          id?: string
          topic_id?: string
          nudger_id?: string
          created_at?: string
        }
      }
    }
    Functions: {
      create_entry_transaction: {
        Args: {
          p_topic_id: string
          p_content: string
          p_confidence: number
          p_is_public?: boolean
          p_entry_date?: string
        }
        Returns: {
          entryId: string
          publicPostId: string | null
          topicId: string
          isPublic: boolean
          entryDate: string
        }
      }
    }
  }
}
