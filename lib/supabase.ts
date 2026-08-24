/**
 * Supabase client — server-side only, never import from client components.
 * Returns null when env vars are absent so stub/dev mode works with zero setup.
 */
import { createClient } from '@supabase/supabase-js'

export const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      )
    : null
