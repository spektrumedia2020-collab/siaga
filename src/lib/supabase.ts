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

export const STORAGE_BUCKET = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'Data Siaga').trim()

export function getStorageConfigurationMessage(error?: any, fallback = 'Gagal mengunggah file') {
  const rawMessage = String(error?.message || error?.statusText || error?.code || '')
  const normalized = rawMessage.toLowerCase()

  if (normalized.includes('bucket') || normalized.includes('not found')) {
    return 'Bucket Supabase belum dibuat atau nama bucket salah. Pastikan bucket tersedia di Storage dan nilainya sesuai dengan VITE_SUPABASE_STORAGE_BUCKET.'
  }

  if (
    normalized.includes('row-level security') ||
    normalized.includes('policy') ||
    normalized.includes('forbidden') ||
    normalized.includes('permission denied')
  ) {
    return 'Kebijakan akses storage/RLS belum diizinkan. Pastikan bucket publik atau policy upload untuk auth pengguna sudah aktif.'
  }

  return fallback
}

export { supabase, supabaseConfigError, hasValidConfig }
export const safeSupabase = supabase ?? emptySupabaseClient

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase client belum tersedia')
  }
  return supabase
}
