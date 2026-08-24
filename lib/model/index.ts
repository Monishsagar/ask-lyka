export type { ModelClient } from './types'
export { StubClient } from './stub'
export { LiveClient } from './live'

import { Listing } from '@/data/listings'
import { ModelClient } from './types'
import { StubClient } from './stub'
import { LiveClient } from './live'

/** Network-error codes Node throws when a host is unreachable / offline. */
const NETWORK_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', 'ECONNRESET'])

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const cause = (err as any).cause
  if (cause?.code && NETWORK_CODES.has(cause.code)) return true
  // fetch() wraps the underlying error in the message on some runtimes
  return err.message.includes('fetch failed') || err.message.includes('ENOTFOUND') || err.message.includes('ECONNREFUSED')
}

/**
 * Wraps LiveClient with a transparent stub fallback.
 * If the live call fails due to a network error (no internet / provider down),
 * it automatically retries with StubClient so the app stays functional offline.
 */
class FallbackClient implements ModelClient {
  private live = new LiveClient()
  private stub = new StubClient()
  usedFallback = false

  async propose(question: string, context: Listing[]) {
    try {
      this.usedFallback = false
      return await this.live.propose(question, context)
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn('[model] Live provider unreachable — falling back to stub mode.')
        this.usedFallback = true
        return this.stub.propose(question, context)
      }
      throw err // non-network errors (bad API key, 4xx) still surface normally
    }
  }
}

/** Returns the active model client based on MODEL_PROVIDER env var. */
export function getModel(): ModelClient {
  return process.env.MODEL_PROVIDER === 'live' ? new FallbackClient() : new StubClient()
}
