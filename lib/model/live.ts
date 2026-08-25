import { Listing } from '@/data/listings'
import { ModelClient } from './types'

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

// openrouter/auto lets OpenRouter pick the best available free model automatically.
// Override via OPENROUTER_MODEL env var if you need a specific model.
const DEFAULT_MODEL = 'openrouter/auto'

const SYSTEM_PROMPT =
  'Answer only using the JSON listing records provided below. ' +
  'Never use outside knowledge about real estate, Dubai, or this developer. ' +
  'State the price, status, or details present in the provided record(s) and explicitly name the supporting record id(s) (e.g. P-01). ' +
  'Never repeat or leak internal agent notes or confidential remarks (such as "do not repeat to client") in client answers. ' +
  'When asked for agent commission, calculate the amount from the price and percentage in notes, and show the exact derivation format: e.g. "Commission: AED 64,000 (3,200,000 × 2% = 64000), based on P-11."'

/**
 * Extracts record IDs (e.g. "P-1", "P-12") from the model's answer text.
 * Returns an empty array rather than throwing if nothing parseable is found —
 * this routes straight into the verifier's "no citation → decline" path.
 */
function extractRecordIds(text: string): string[] {
  const matches = [...(text.matchAll(/\bP-\d+\b/g) || [])]
  return [...new Set(matches.map(m => m[0]))]
}

export class LiveClient implements ModelClient {
  async propose(question: string, context: Listing[]) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

    const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL
    const referer = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

    const body = {
      model,
      temperature: 0,
      max_tokens: 256,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({ question, records: context }),
        },
      ],
    }

    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': referer,
        'X-Title': 'Ask Lyka',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpenRouter error ${response.status}: ${err}`)
    }

    const json = await response.json()
    const answerText: string = json.choices?.[0]?.message?.content ?? ''

    // Safe parse: empty array if model didn't name record ids — verify() handles it.
    const citedRecordIds = extractRecordIds(answerText)

    return { answerText, citedRecordIds }
  }
}
