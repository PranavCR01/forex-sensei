import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  const missing = [
    !url && 'VITE_SUPABASE_URL',
    !key && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(', ')

  throw new Error(
    `Missing required environment variable(s): ${missing}\n` +
    `Copy .env.local.example to .env.local and fill in your Supabase project values.`
  )
}

export const supabase = createClient(url, key)
