/**
 * client-stub.ts
 *
 * Runs the full retrieve → stub-propose → verify pipeline entirely in the
 * browser (no server call).  Imported only by the React component so it is
 * never bundled into any server-side code.
 *
 * Used as an offline / server-unreachable fallback: when fetch('/api/ask')
 * fails with a network error we run this instead and show the result with
 * mode === 'offline-stub'.
 */

import { retrieve } from '@/lib/retrieval'
import { StubClient } from '@/lib/model/stub'
import { verify, deduplicateCitations } from '@/lib/verify'

const stub = new StubClient()

export interface ClientStubResult {
  outcome: string
  answer: string | null
  citations: { id: string; field: string }[]
  reason: string
  verifiedClaims: { claim: string; recordId: string; field: string; matched: boolean }[]
  mode: 'offline-stub'
  timestamp: string
  question: string
}

/** Network-error messages emitted by various browsers when offline. */
const NETWORK_MESSAGES = [
  'load failed',        // Safari
  'failed to fetch',    // Chrome / Edge
  'networkerror',       // Firefox
  'network request failed',
]

export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return NETWORK_MESSAGES.some(m => msg.includes(m))
}

export async function runClientStub(question: string): Promise<ClientStubResult> {
  const found = retrieve(question)

  if (found.outcome) {
    return {
      outcome: found.outcome,
      answer: null,
      citations: [],
      reason: found.reason ?? '',
      verifiedClaims: [],
      mode: 'offline-stub',
      timestamp: new Date().toISOString(),
      question,
    }
  }

  const proposal = await stub.propose(question, found.records)
  const check = verify(proposal.answerText, proposal.citedRecordIds, found.records)

  return check.ok
    ? {
        outcome: 'ANSWERED',
        answer: proposal.answerText,
        citations: deduplicateCitations(check.verifiedClaims),
        reason: check.reason,
        verifiedClaims: check.verifiedClaims,
        mode: 'offline-stub',
        timestamp: new Date().toISOString(),
        question,
      }
    : {
        outcome: 'DECLINED_NOT_GROUNDED',
        answer: null,
        citations: [],
        reason: check.reason,
        verifiedClaims: check.verifiedClaims,
        mode: 'offline-stub',
        timestamp: new Date().toISOString(),
        question,
      }
}
