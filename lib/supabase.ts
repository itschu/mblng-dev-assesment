import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface User {
  id: string
  username: string
  total_wins: number
  total_losses: number
  created_at: string
}

export interface GameSession {
  id: string
  session_date: string
  winning_number: number | null
  status: 'waiting' | 'active' | 'finished'
  max_players: number
  current_players: number
  session_duration: number
  created_at: string
  started_at: string | null
  ended_at: string | null
}

export interface SessionParticipant {
  id: string
  session_id: string
  user_id: string
  chosen_number: number | null
  is_winner: boolean
  joined_at: string
  is_starter: boolean
}