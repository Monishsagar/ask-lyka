# Notes

## Assumptions

P-09 is declined as `DECLINED_NOT_GROUNDED` because a withdrawn price is no longer valid to quote. P-03's truncated note is preserved verbatim. P-05/P-06 are treated as an identical-value duplicate and do not block an answer. The in-memory log is intentionally session-scoped for this no-database brief.

## The ten traps

1, 3, 5, 6, 7, 8, 9, 10, 11 are traps from ambiguity, missing/unreliable data, policy, or derivation rules; Q2 and Q12 are direct lookups. Q4 is a duplicate that should pass. (This list is retained as the working classification; verify against the runner output.)

## Q1 — the rule you think is wrong

R7's best-guess timeout contradicts R2 and R6: a live call could briefly show a fabricated or unreliable value before correction. For example, a currency-conflict answer must not briefly expose either AED or USD simply because verification was slow.

## Q2 — your transit assistant, honestly

[FILL IN YOURSELF]

## Q3 — the P-11 commission

The verifier permits 64,000 AED only when the answer shows the inputs and equation. It independently reads AED 3,200,000 from `price`, 2% from `notes`, recomputes price × percentage, and requires the shown expression; this is transparent derivation, not an unsupported number.

## Q4 — determinism

Model sampling is reduced with temperature 0 and does not decide outcomes; exact field matching does. Retrieval is sorted by id, recency ties decline, and identical-value duplicates agree. The R7 timeout race remains a deliberate wall-clock nondeterminism leak.

## Q5 — where AI got it wrong

[FILL IN YOURSELF]

## What I did not finish

The log is persisted to Supabase when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set; it falls back to in-memory when they are absent. The live provider is OpenRouter (`https://openrouter.ai/api/v1/chat/completions`), using its OpenAI-compatible chat endpoint.

## Twelve-question log

Run `npm run questions` against the dev server to paste the actual session output here.
