import { NextResponse } from 'next/server'
import { retrieve } from '@/lib/retrieval'
import { getModel } from '@/lib/model'
import { verifyWithTimeout, deduplicateCitations } from '@/lib/verify'
import { addLog } from '@/lib/log'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  // Declared outside try so the catch block can log it (R8: every question is accounted for).
  let question: string | null = null

  try {
    const body = await req.json()
    question = String(body.question || '')
    const found = retrieve(question)
    let result: any

    if (found.outcome) {
      result = {
        outcome: found.outcome,
        answer: null,
        citations: [],
        reason: found.reason,
        verifiedClaims: [],
      }
    } else {
      const model = getModel()
      const proposal = await model.propose(question, found.records)
      // R7: verifyWithTimeout is called as specified — if verification exceeds 2 s the
      // proposal is returned unverified. See NOTES.md Q1 for why this rule is wrong.
      const check = await verifyWithTimeout(proposal.answerText, proposal.citedRecordIds, found.records)
      result = check.ok
        ? {
            outcome: 'ANSWERED',
            answer: proposal.answerText,
            citations: deduplicateCitations(check.verifiedClaims),
            reason: check.reason,
            verifiedClaims: check.verifiedClaims,
          }
        : {
            outcome: 'DECLINED_NOT_GROUNDED',
            answer: null,
            citations: [],
            reason: check.reason,
            verifiedClaims: check.verifiedClaims,
          }
      // Detect if FallbackClient silently switched to stub due to no internet
      const usedFallback = (model as any).usedFallback === true
      if (usedFallback) result._fallback = true
    }

    // Determine the actual mode label
    let mode: string
    if (process.env.MODEL_PROVIDER === 'live') {
      mode = result._fallback ? 'stub-fallback' : 'live'
    } else {
      mode = 'stub'
    }
    delete result._fallback

    const response = {
      ...result,
      timestamp: new Date().toISOString(),
      mode,
      question,
    }

    // Log after the outcome is final — never in the decision path.
    await addLog(response)

    return NextResponse.json(response)
  } catch (err: any) {
    // Always return JSON so the client never crashes on response.json().\
    const isNetworkError =
      err?.cause?.code === 'ECONNREFUSED' ||
      err?.cause?.code === 'ENOTFOUND' ||
      err?.message?.includes('fetch failed') ||
      err?.message?.includes('network')

    console.error('[api/ask] unhandled error:', err?.message)

    const errorResponse = {
      outcome: 'DECLINED_NOT_GROUNDED',
      answer: null,
      citations: [],
      reason: isNetworkError
        ? 'Unable to reach the model provider — check your internet connection and try again.'
        : `Service error: ${err?.message ?? 'unknown error'}`,
      verifiedClaims: [],
      timestamp: new Date().toISOString(),
      mode: process.env.MODEL_PROVIDER === 'live' ? 'live' : 'stub',
      question,
    }

    // R8: log error responses too — fire-and-forget so a logging failure never masks the original error.
    addLog(errorResponse).catch(() => {})

    return NextResponse.json(errorResponse, { status: 500 })
  }
}
