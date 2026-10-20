import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (import.meta?.env) {
  const exposedKeys = Object.keys(import.meta.env)
  const forbiddenLeaked = exposedKeys.filter(
    k => k.toLowerCase().includes('service_role') || k.toLowerCase().includes('secret')
  )
  if (forbiddenLeaked.length > 0) {
    throw new Error(`[Security Alert] Privileged server keys detected in client bundle: ${forbiddenLeaked.join(', ')}`)
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[SupabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Using placeholder client for resilience.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
)
