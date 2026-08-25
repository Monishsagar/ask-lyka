'use client'
import { useState } from 'react'
import { isNetworkError, runClientStub } from '@/lib/client-stub'

export function AskLyka() {
  const [q, setQ] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (loading || !q.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })

      let data: any
      try {
        data = await res.json()
      } catch {
        throw new Error('Server did not return a valid response. Is the dev server running?')
      }

      setResult(data)
    } catch (err: any) {
      // If the server is unreachable (offline / Vercel down), run the stub
      // pipeline entirely in the browser so the app stays usable.
      if (isNetworkError(err)) {
        try {
          const offlineResult = await runClientStub(q)
          setResult(offlineResult)
        } catch (stubErr: any) {
          setError(stubErr?.message ?? 'Offline stub error.')
        }
      } else {
        setError(err?.message ?? 'Network error — check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Enter = submit, Shift+Enter = newline
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!loading && q.trim()) ask(e as any)
    }
  }

  return (
    <section className="ask-panel">
      <div className="eyebrow">Grounded property intelligence</div>
      <h1>Ask Lyka.</h1>
      <p className="lede">Answers are checked against a fixed listing register before they reach you.</p>

      <form onSubmit={ask}>
        <label htmlFor="question">Your question</label>
        <textarea
          id="question"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's the price of Marina Bay Residences unit 1204?"
          rows={3}
        />
        <p className="hint">Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for a new line</p>
        <button disabled={loading || !q.trim()}>
          {loading ? 'Checking…' : 'Ask Lyka'}
        </button>
      </form>

      {error && (
        <article className="result declined_not_grounded">
          <div className="result-head">
            <span>SERVICE UNAVAILABLE</span>
          </div>
          <p className="reason">{error}</p>
        </article>
      )}

      {result && (
        <article className={`result ${result.outcome?.toLowerCase()}`}>
          <div className="result-head">
            <span>{result.outcome?.replaceAll('_', ' ')}</span>
            {result.mode && (
              <small style={result.mode === 'offline-stub' ? { color: 'var(--amber, #f59e0b)', fontWeight: 600 } : undefined}>
                {result.mode === 'offline-stub' ? '⚡ offline · stub' : result.mode + ' mode'}
              </small>
            )}
          </div>
          {result.answer && <p className="answer">{result.answer}</p>}
          <p className="reason">{result.reason}</p>
          {result.citations?.length > 0 && (
            <p className="citations">
              Cited {result.citations.map((c: any) => `${c.id}.${c.field}`).join(', ')}
            </p>
          )}
        </article>
      )}
    </section>
  )
}

