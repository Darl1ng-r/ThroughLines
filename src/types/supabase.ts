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
          created_at?: string
        }
        Insert: {
          id: string
          username: string
          display_name: string
          bio?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string
          bio?: string | null
          created_at?: string
        }
      }
      topics: {
        Row: {
          id: string
          user_id: string
          title: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          slug?: string
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
          entry_date: string
        }
        Insert: {
          id?: string
          topic_id: string
          user_id: string
          content: string
          confidence_rating: number
          entry_date?: string
        }
        Update: {
          id?: string
          topic_id?: string
          user_id?: string
          content?: string
          confidence_rating?: number
          entry_date?: string
        }
      }
      public_posts: {
        Row: {
          id: string
          topic_id: string
          user_id: string
          content: string
          confidence_rating: number
          entry_date: string
          moderation_status: 'pending' | 'approved' | 'flagged'
        }
        Insert: {
          id?: string
          topic_id: string
          user_id: string
          content: string
          confidence_rating: number
          entry_date?: string
          moderation_status?: 'pending' | 'approved' | 'flagged'
        }
        Update: {
          id?: string
          topic_id?: string
          user_id?: string
          content?: string
          confidence_rating?: number
          entry_date?: string
          moderation_status?: 'pending' | 'approved' | 'flagged'
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
  }
}
