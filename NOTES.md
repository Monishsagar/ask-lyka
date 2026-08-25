# Notes

## Assumptions

P-09 is declined as `DECLINED_NOT_GROUNDED` because a withdrawn price is no longer valid to quote. P-03's truncated note is preserved verbatim. P-05/P-06 are treated as an identical-value duplicate and do not block an answer. The in-memory log is intentionally session-scoped for this no-database brief.

1, 2, 3, 5, 6, 7, 8, 9, 10, 11 are the ten traps (covering ambiguity, missing/unreliable data, policy, calculations, and privacy leaks like Q2's confidential note). Q12 is a direct lookup, and Q4 is a duplicate row that should merge and pass.

## Q1 — the rule you think is wrong

R7's best-guess timeout contradicts R2 and R6: a live call could briefly show a fabricated or unreliable value before correction. For example, a currency-conflict answer must not briefly expose either AED or USD simply because verification was slow.

## Q2 — your transit assistant, honestly

The AI chat is grounded in the actual search result JSON, so it can only explain data that was already computed — it cannot invent or hallucinate bus numbers, fares, or timings.

## Q3 — the P-11 commission

The verifier permits 64,000 AED only when the answer shows the inputs and equation. It independently reads AED 3,200,000 from `price`, 2% from `notes`, recomputes price × percentage, and requires the shown expression; this is transparent derivation, not an unsupported number.

## Q4 — determinism

Model sampling is reduced with temperature 0 and does not decide outcomes; exact field matching does. Retrieval is sorted by id, recency ties decline, and identical-value duplicates agree. The R7 timeout race remains a deliberate wall-clock nondeterminism leak.

## Q5 — where AI got it wrong

AI did most of the heavy lifting — the question matching, answer generation, grounding verifier, live model connection, and UI.

I handled the judgment calls — which questions to refuse, what edge cases to test, and how to structure the 12 test questions.

Where AI went wrong:

Offline fallback — Going offline on the deployed site just showed a "Load failed" error. AI never accounted for this. I caught it by testing offline and fixed it so the app still answers using local logic in the browser.

Opposite status questions — Asking "Is it available?" for a Sold unit gave a "DECLINED NOT GROUNDED" instead of a proper answer. I caught it by testing that exact question on the live app and fixed the verifier to not misread negated words like "not Available."

Wrong docs — README had the wrong install command and wrong model name. Caught by comparing docs to the actual code.

## What I did not finish

The log is persisted to Supabase when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set; it falls back to in-memory when they are absent. The live provider is OpenRouter (`https://openrouter.ai/api/v1/chat/completions`), using its OpenAI-compatible chat endpoint.

## Twelve-question log

Run `npm run questions` against the dev server to paste the actual session output here.
