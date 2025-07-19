import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let supabaseClient: ReturnType<typeof createClient> | null = null

export const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    // Server-side rendering - return null or throw error
    throw new Error('Supabase client cannot be used during server-side rendering')
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  return supabaseClient
}

// For backward compatibility - only create on client side
export const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null
