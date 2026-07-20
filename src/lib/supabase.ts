import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      houses: {
        Row: {
          id: string
          user_id: string
          name: string
          logo_url: string | null
          color: string
          balance: number
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          logo_url?: string | null
          color?: string
          balance?: number
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          logo_url?: string | null
          color?: string
          balance?: number
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      operations: {
        Row: {
          id: string
          user_id: string
          date: string
          desired_return: number | null
          notes: string | null
          status: string
          returns_freebet_on_loss: boolean
          potential_freebet_amount: number
          freebet_status: 'pendente' | 'recebida' | 'usada' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          date: string
          desired_return?: number | null
          notes?: string | null
          status?: string
          returns_freebet_on_loss?: boolean
          potential_freebet_amount?: number
          freebet_status?: 'pendente' | 'recebida' | 'usada' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          desired_return?: number | null
          notes?: string | null
          status?: string
          returns_freebet_on_loss?: boolean
          potential_freebet_amount?: number
          freebet_status?: 'pendente' | 'recebida' | 'usada' | null
          created_at?: string
          updated_at?: string
        }
      }
      operation_entries: {
        Row: {
          id: string
          operation_id: string
          house_id: string
          market: string | null
          selection: string | null
          bet_type: string
          odd: number
          stake: number
          source_freebet_operation_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          operation_id: string
          house_id: string
          market?: string | null
          selection?: string | null
          bet_type?: string
          odd: number
          stake: number
          source_freebet_operation_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          operation_id?: string
          house_id?: string
          market?: string | null
          selection?: string | null
          bet_type?: string
          odd?: number
          stake?: number
          source_freebet_operation_id?: string | null
          created_at?: string
        }
      }
      deposits: {
        Row: {
          id: string
          user_id: string
          house_id: string
          amount: number
          date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          house_id: string
          amount: number
          date: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          house_id?: string
          amount?: number
          date?: string
          notes?: string | null
          created_at?: string
        }
      }
      withdrawals: {
        Row: {
          id: string
          user_id: string
          house_id: string
          amount: number
          date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          house_id: string
          amount: number
          date: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          house_id?: string
          amount?: number
          date?: string
          notes?: string | null
          created_at?: string
        }
      }
      transfers: {
        Row: {
          id: string
          user_id: string
          from_house_id: string
          to_house_id: string
          amount: number
          date: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          from_house_id: string
          to_house_id: string
          amount: number
          date: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          from_house_id?: string
          to_house_id?: string
          amount?: number
          date?: string
          notes?: string | null
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          user_id: string
          bankroll: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          bankroll?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bankroll?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          phone: string | null
          status_badge: 'lead' | 'cliente' | 'expirado'
          is_lifetime: boolean
          trial_started_at: string | null
          expires_at: string | null
          registration_completed: boolean
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone?: string | null
          status_badge?: 'lead' | 'cliente' | 'expirado'
          is_lifetime?: boolean
          trial_started_at?: string | null
          expires_at?: string | null
          registration_completed?: boolean
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone?: string | null
          status_badge?: 'lead' | 'cliente' | 'expirado'
          is_lifetime?: boolean
          trial_started_at?: string | null
          expires_at?: string | null
          registration_completed?: boolean
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      feedbacks: {
        Row: {
          id: string
          user_id: string | null
          user_email: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          user_email?: string
          message?: string
          created_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          email: string | null
          phone: string | null
          status: 'abandoned' | 'registered'
          auth_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          phone?: string | null
          status?: 'abandoned' | 'registered'
          auth_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          phone?: string | null
          status?: 'abandoned' | 'registered'
          auth_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
