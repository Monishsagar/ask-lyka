import { supabase } from '@/lib/supabase'

// Fallback: in-memory log used when Supabase env vars are absent (stub / local dev).
let entries: any[] = []

export async function addLog(entry: any): Promise<any> {
  if (supabase) {
    const { error } = await supabase.from('question_log').insert({
      question: entry.question,
      outcome: entry.outcome,
      answer: entry.answer ?? null,
      citations: entry.citations ?? [],
      reason: entry.reason,
      verified_claims: entry.verifiedClaims ?? [],
      mode: entry.mode,
    })
    if (error) {
      // Never throw — logging failure must not disrupt the API response.
      console.error('[log] Supabase insert error:', error.message)
    }
  } else {
    entries.push(entry)
  }
  return entry
}

export async function getLog(): Promise<any[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('question_log')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) {
      console.error('[log] Supabase select error:', error.message)
      return []
    }
    return data ?? []
  }
  return entries
}
