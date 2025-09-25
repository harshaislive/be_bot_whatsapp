import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type MessageTemplate = {
  id: string
  key: string
  title: string
  content: string
  variables: string[]
  category: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export type MessageCategory = {
  id: string
  name: string
  display_name: string
  description?: string
  color: string
  created_at: string
}

export type MessageUsage = {
  id: string
  template_key: string
  used_at: string
  user_phone?: string
  response_time_ms?: number
  context: Record<string, any>
}