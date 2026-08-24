import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

// ─── Test 1: LiveClient output parser ────────────────────────────────────────
// Verifies that when the model response contains no parseable record id,
// citedRecordIds is [] rather than throwing — so verify()'s "no citation →
// decline" path handles it without any new decline logic needed here.

describe('LiveClient.propose — response parsing', () => {
  beforeEach(() => {
    vi.stubEnv('OPENROUTER_API_KEY', 'sk-or-test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns empty citedRecordIds when model response contains no record id', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'I cannot determine the price from the context.' } }],
      }),
    }))

    const { LiveClient } = await import('@/lib/model/live')
    const client = new LiveClient()
    const result = await client.propose('What is the price?', [])

    expect(result.answerText).toBe('I cannot determine the price from the context.')
    // No P-\d+ in the answer → empty array, not an error.
    expect(result.citedRecordIds).toEqual([])
  })

  it('correctly extracts one or more record ids when present', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'The price is AED 1,420,000 per record P-10, field price.' } }],
      }),
    }))

    const { LiveClient } = await import('@/lib/model/live')
    const client = new LiveClient()
    const result = await client.propose('What is the price?', [])

    expect(result.citedRecordIds).toEqual(['P-10'])
  })

  it('deduplicates record ids mentioned multiple times', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'See P-10 and P-10 again.' } }],
      }),
    }))

    const { LiveClient } = await import('@/lib/model/live')
    const client = new LiveClient()
    const { citedRecordIds } = await client.propose('?', [])
    expect(citedRecordIds).toEqual(['P-10'])
  })
})

// ─── Test 2: addLog falls back to in-memory when supabase is null ─────────────
// Confirms CI works with no Supabase credentials — log stays in-memory.

describe('log — in-memory fallback when supabase is null', () => {
  it('writes to the in-memory array and getLog returns it', async () => {
    // Mock supabase module to return null, guaranteeing the in-memory fallback.
    vi.doMock('@/lib/supabase', () => ({ supabase: null }))

    const { addLog, getLog } = await import('@/lib/log')

    const entry = {
      question: 'Is unit 802 available?',
      outcome: 'ANSWERED',
      answer: 'Yes, it is Available.',
      citations: [{ id: 'P-2', field: 'status' }],
      reason: 'all extracted claims match cited raw fields or an allowed derivation.',
      verifiedClaims: [],
      mode: 'stub',
      timestamp: new Date().toISOString(),
    }

    await addLog(entry)
    const log = await getLog()

    expect(log).toContainEqual(expect.objectContaining({ question: entry.question }))

    vi.doUnmock('@/lib/supabase')
  })
})
