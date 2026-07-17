import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const emptySupabaseClient = null as unknown as SupabaseClient

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

const isPlaceholderValue = (value?: string) => {
  if (!value) return true
  return value.includes('your_') || value.includes('replace') || value.includes('example') || value.includes('supabase_anon_key_here') || value.includes('supabase_url_here')
}

const hasValidConfig = Boolean(supabaseUrl && supabaseKey && !isPlaceholderValue(supabaseUrl) && !isPlaceholderValue(supabaseKey))

let supabase: SupabaseClient | null = emptySupabaseClient
let supabaseConfigError: string | null = null

if (!hasValidConfig) {
  supabaseConfigError = 'Supabase URL/Anon Key belum diisi dengan nilai valid di .env.local atau .env'
} else {
  try {
    supabase = createClient(supabaseUrl!, supabaseKey!)
  } catch (error: any) {
    supabaseConfigError = error?.message || 'Gagal menginisialisasi client Supabase'
    console.error('Supabase init error:', error)
  }
}

export { supabase, supabaseConfigError, hasValidConfig }
export const safeSupabase = supabase ?? emptySupabaseClient

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase client belum tersedia')
  }
  return supabase
}
