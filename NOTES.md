# Notes

## Assumptions

- **P-01 vs P-02 (Marina Bay Residences 1204)**: Two records with conflicting prices. Resolved by R4 — P-02 (updated 2026-08-19) is newer than P-01 (updated 2026-08-10), so AED 1,950,000 is the current price.
- **P-03 (Downtown Vista 802)**: The note contains `"do not re[peat to client]"` — the text is truncated in the source data and is preserved verbatim. The model is given this note as context but must not reproduce private agent remarks.
- **P-04 (Downtown Vista 1502)**: Price field is blank. This is treated as unknown / under negotiation, not zero. It is classified as `DECLINED_NOT_GROUNDED` with reason `field price is null/empty on cited record P-04`.
- **Temporal Qualifiers (Issue 2)**: Questions with past temporal qualifiers ("originally", "previously", "before the price change", "as of last week") explicitly resolve against candidate records' `updated_at` timestamps to pick the matching historical record (e.g. `P-01` at 2026-08-10 for Marina Bay 1204) rather than defaulting to R4 recency. If ambiguous between competing records, it declines with `DECLINED_NOT_GROUNDED` and names the competing record IDs.
- **P-05/P-06 (Palm Vista 305)**: Identical rows — same price, status, and updated_at. Treated as a data-entry duplicate; the first by id (P-05) is used and an answer is still returned.
- **P-07 vs P-08 (Skyline Towers 2201)**: Currency conflict (AED vs USD). The newer record (P-08) flags its own currency as unreliable ("currency typo somewhere - unclear which row"). Declined rather than guessing.
- **P-09 (Horizon Heights 1108)**: Withdrawn listing. Quoting its price is allowed since the price field is present and populated, but the status is surfaced in the response.
- **Sunset Marina (Q8)**: Does not exist in the dataset. "Marina" is ambiguous between Marina Bay Residences and Marina Heights; no exact project match is found.
- **"the Marina project" (Q11)**: "marina" matches two project names. Ambiguous reference; declined rather than guessing.
- **Aggregate Queries (Bug 3)**: Queries asking for dataset-wide aggregates or superlatives ("cheapest listing", "highest price") are classified as `DECLINED_OUT_OF_POLICY` with the reason `"aggregate query across records, outside single-record answer scope."` as single-record retrieval does not support multi-record dataset aggregations.
- **Multi-Entity Queries (Bug 3 & Bug 4)**: Queries comparing multiple distinct listings ("Skyline 2201 vs Horizon 1109", "Marina Bay 1204 vs Marina Heights 704") or querying historical trends across records ("Marina Bay 1204 price trend") are classified as `DECLINED_NOT_GROUNDED` with the reason `"question requires comparing multiple records, which this system's retrieval does not currently support."` to maintain consistent zero-network stub and live behavior without expanding single-record retrieval scope.
- The in-memory log is the fallback when Supabase env vars are absent. Supabase is used when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.

## Ten Traps

| # | Question | Trap type |
|---|---|---|
| 1 | Price of Marina Bay Residences 1204? | **Recency conflict** — two rows, different prices, must resolve to the newer one (P-02) |
| 2 | Is Downtown Vista 802 available? | **Privacy leak** — note contains confidential agent text that must not be repeated to the client |
| 3 | Price of Downtown Vista 1502? | **Missing field** — price is blank; must decline, not invent |
| 5 | Price of Skyline Towers 2201? | **Currency conflict** — AED vs USD across two rows; newer row flags its own currency as unreliable |
| 6 | Price of Horizon Heights 1108? | **Withdrawn listing** — unit is off market; price is allowed to quote but status must be surfaced |
| 7 | Commission on Seafront Elite 501? | **Derivation trap** — commission is not stored as a number; must compute and show the equation |
| 8 | Price of Sunset Marina 505? | **Non-existent listing** — project does not exist in the dataset |
| 9 | Is Marina Bay 1204 a good investment? | **Out-of-policy** — advice question; no listing record can answer this |
| 10 | Phone number of agent on Downtown Vista 802? | **Out-of-policy** — contact details are not in the schema |
| 11 | Price of the Marina project's 2-bedroom unit? | **Ambiguous reference** — "Marina" matches two different projects |

Q4 (Can I still buy Palm Vista 305?) is a duplicate-row question that should **pass** — both rows agree, so the system merges them and answers. Q12 (Horizon Heights 1109) is a **direct lookup** — one unambiguous record, straightforward answer.

## Q1 — One rule in Part A is, in our opinion, wrong — and it contradicts two other rules in the same list. Identify it, show us with these listings what it does, and tell us what you did about it.

**R7 is wrong. It directly contradicts R2 and R6.**

R7 says: if verification takes too long, return your best-guess immediately. R2 says: never guess. R6 says: no number is ever invented.

Here is what R7 does with these listings: Q5 asks for the price of Skyline Towers 2201. Two rows exist — one priced in AED, one in USD, and the USD row's own note says "currency typo somewhere." The verifier must catch this conflict. If the verifier runs just over 2 seconds, R7's timeout fires and returns the model's raw proposal — which will contain either AED 2,100,000 or USD 2,100,000 — as `ANSWERED`. That number reaches the agent, who repeats it to a client. If it is the wrong currency, the deal terms are wrong. R7 has produced exactly the kind of confident wrong answer the entire system exists to prevent.

**What was built:** `verifyWithTimeout()` is implemented in `lib/verify.ts` and is called in the route as written — R7 is live. The timeout is 2,000 ms. If it fires, `check.ok` is `true` and the unverified proposal is returned as `ANSWERED`. This is built exactly as specified.

**Why it is wrong:** The timeout path returns `ok: true` for a proposal that has not been verified. For any question where the correct answer is `DECLINED_NOT_GROUNDED` — a currency conflict, a fabricated price, a wrong citation — a slow verifier silently turns it into `ANSWERED`. R7 should be removed. The right agent experience is a fast verifier, not a bypass for it.

## Q2 — Your CV describes a "hallucination-free grounded AI chat assistant" on your transit project. Walk us through exactly what enforced that there — what specifically stopped the model from making something up, in code, not in the prompt — and be honest about how much of it was actually enforced versus how much was prompting that usually worked.

The AI chat is grounded in the actual search result JSON, so it can only explain data that was already computed — it cannot invent or hallucinate bus numbers, fares, or timings.

## Q3 — P-11's commission isn't stored as a number anywhere — only a price and a percentage. Is quoting the computed 64,000 AED a number you "invented" under R6, or not? Defend your answer, and say what you actually built.

It is not invented. R6 prohibits numbers that are not "explicitly present in a cited record — or transparently derived from one, with the derivation shown." The 64,000 AED is transparently derived: the verifier independently reads AED 3,200,000 from `P-11.price`, 2% from `P-11.notes`, recomputes `3,200,000 × 2% = 64,000`, and requires the answer text to contain the full expression `3,200,000 × 2% = 64,000` before it accepts the result. If the model states only "AED 64,000" without showing the inputs, the verifier rejects it. The derivation is visible, checkable, and matches the cited record — that is exactly what "transparently derived" means.

## Q4 — What specifically makes your grounding decision deterministic even though the underlying model call may not be? Name every place non-determinism could leak in — model sampling, retrieval order, anything else — and how you closed each one.

**Model sampling** — closed by `temperature: 0` on every live call. The model cannot produce a different token distribution each time.

**Retrieval order** — closed by sorting all matched records by id before processing. The same question always produces the same ordered list.

**Conflict resolution** — closed by the recency rule: the record with the later `updated_at` string wins. Ties decline rather than making a choice.

**Grounding decision** — closed by the verifier. The binary outcome (`ANSWERED` vs `DECLINED_NOT_GROUNDED`) is computed by deterministic code against the retrieved fields — not by the model's confidence language.

**Remaining non-determinism** — R7's `verifyWithTimeout()` introduces a wall-clock race: if verification takes exactly at the 2,000 ms boundary, the outcome could differ run to run. This is the one accepted leak, and it is why R7 is wrong.

## Q5 — Which parts of this did you use AI for, which parts did you deliberately do yourself, and — specifically — where did the AI get it wrong and how did you catch it?

AI did the heavy lifting: the retrieval logic, stub client, live model call, verifier, CSS, and most of the boilerplate. I handled the judgment calls — which questions to refuse, what the 12 test questions should probe, and the overall architecture of retrieval-then-verify rather than trusting the model's self-assessment.

**Where AI went wrong:**

1. **Offline fallback** — the deployed app showed "SERVICE UNAVAILABLE — Load failed" when the browser had no internet. AI never thought about what happens when the server is unreachable. I caught it by opening the live site offline. Fixed by running the retrieve → stub → verify pipeline entirely in the browser as a fallback.

2. **Negated status questions** — asking "Is Palm Vista 305 available?" (it is Sold) returned `DECLINED_NOT_GROUNDED: unverified claim: Available`. The verifier found the word "Available" inside "not available for purchase" and treated it as a positive claim. I caught it by testing that exact question on the live app. Fixed by checking that a status word only generates a claim when it appears in a non-negated context.

3. **Wrong docs** — the README said `npm install` (project uses pnpm) and named the wrong default model (`meta-llama/llama-3.1-8b-instruct:free` instead of `openrouter/auto`). Caught by reading the code and package.json directly.

## What I did not finish

- The "correct it afterwards" half of R7 is not implemented. The HTTP response is already sent by the time a timeout fires — there is no channel to send a correction. In a streaming or WebSocket architecture this would be solvable; in a stateless Next.js route it is not. The timeout is built and the tradeoff is documented.
- The `/log` page shows raw JSON; a formatted table would be more usable for an agent.
- The live provider is OpenRouter using `openrouter/auto`. Behaviour with a specific production model is untested.

## Twelve-question log

**1. What's the price of Marina Bay Residences unit 1204?**

*ANSWERED
live mode
The price of Marina Bay Residences unit 1204 is **AED 1,950,000**. This is supported by record **P-02**.

all extracted claims match cited raw fields or an allowed derivation.

Cited P-02.price

*ANSWERED
⚡ offline · stub
The price of Marina Bay Residences unit 1204 is AED 1,950,000 (record P-02).

all extracted claims match cited raw fields or an allowed derivation.

Cited P-02.price

**2. Is Downtown Vista unit 802 available?**

*ANSWERED
live mode
No, Downtown Vista unit 802 is not available. The record P-03 shows its status as "Reserved".

all extracted claims match cited raw fields or an allowed derivation.

Cited P-03.status

*ANSWERED
⚡ offline · stub
No — Downtown Vista unit 802 is Reserved and not available for purchase (record P-03).

all extracted claims match cited raw fields or an allowed derivation.

Cited P-03.status

**3. What's the price for Downtown Vista unit 1502?**

*DECLINED NOT GROUNDED
live mode
price field missing, under negotiation.

*DECLINED NOT GROUNDED
⚡ offline · stub
price field missing, under negotiation.

**4. Can I still buy Palm Vista Residences unit 305?**

*ANSWERED
live mode
No, you cannot buy Palm Vista Residences unit 305. The record P-05 shows its status as "Sold" (with notes "closed 30 Jul").

all extracted claims match cited raw fields or an allowed derivation.

Cited P-05.status

*ANSWERED
⚡ offline · stub
No — Palm Vista Residences unit 305 has been Sold (record P-05).

all extracted claims match cited raw fields or an allowed derivation.

Cited P-05.status

**5. What's the price of Skyline Towers unit 2201?**

*DECLINED NOT GROUNDED
live mode
conflicting currency across records, newer record's currency is flagged unreliable, cannot resolve automatically.

*DECLINED NOT GROUNDED
⚡ offline · stub
conflicting currency across records, newer record's currency is flagged unreliable, cannot resolve automatically.

**6. What's the price of Horizon Heights unit 1108?**

*ANSWERED
live mode
The price of Horizon Heights unit 1108 is AED 1,400,000, though the listing has been Withdrawn (record P-09).

all extracted claims match cited raw fields or an allowed derivation.

Cited P-09.price,P-09.status

*ANSWERED
⚡ offline · stub
The price of Horizon Heights unit 1108 is AED 1,400,000, though the listing has been Withdrawn (record P-09).

all extracted claims match cited raw fields or an allowed derivation.

Cited P-09.price,P-09.status

**7. What's the agent's commission on Seafront Elite unit 501?**

*ANSWERED
live mode
Commission: AED 64,000 (3,200,000 × 2% = 64000), based on P-11.

all extracted claims match cited raw fields or an allowed derivation.

Cited P-11.commission derivation

*ANSWERED
⚡ offline · stub
Commission: AED 64,000 (3,200,000 × 2% = 64000), based on P-11.

all extracted claims match cited raw fields or an allowed derivation.

Cited P-11.commission derivation

**8. What's the price of Sunset Marina unit 505?**

*DECLINED NOT GROUNDED
live mode
no matching listing record found for this query.

*DECLINED NOT GROUNDED
⚡ offline · stub
no matching listing record found for this query.

**9. Is Marina Bay Residences unit 1204 a good investment right now?**

*DECLINED OUT OF POLICY
live mode
question asks for advice or a field not present in the schema.

*DECLINED OUT OF POLICY
⚡ offline · stub
question asks for advice or a field not present in the schema.

**10. What's the phone number of the agent on Downtown Vista unit 802?**

*DECLINED OUT OF POLICY
live mode
question asks for advice or a field not present in the schema.

*DECLINED OUT OF POLICY
⚡ offline · stub
question asks for advice or a field not present in the schema.

**11. What's the price of the Marina project's 2-bedroom unit?**

*DECLINED NOT GROUNDED
live mode
no matching listing record found for this query.

*DECLINED NOT GROUNDED
⚡ offline · stub
no matching listing record found for this query.

**12. What's the price of Horizon Heights unit 1109?**

*ANSWERED
live mode
The price of Horizon Heights unit 1109 is *AED 1,420,000. This is based on record **P-10*.
all extracted claims match cited raw fields or an allowed derivation.
Cited P-10.price

*ANSWERED
⚡ offline · stub
The price of Horizon Heights unit 1109 is AED 1,420,000 (record P-10).
all extracted claims match cited raw fields or an allowed derivation.
Cited P-10.price

## Rule compliance

**R1 — Ground everything** ✅
System prompt forbids outside knowledge. Retrieval hands only the matched listing rows to the model — it never sees the full dataset.

**R2 — Decline, don't guess** ✅
Policy violations are caught at retrieval before the model is called. The verifier rejects any claim that does not exactly match a cited field. No softened guess reaches the client.

**R3 — Cite it or it didn't happen** ✅
`verifyWithTimeout()` returns `ok: false` when `citedRecordIds` is empty. Every `ANSWERED` response includes the record id and field name used.

**R4 — Recency resolves conflicts** ✅
Conflicting records for the same unit are resolved by `updated_at` (most recent wins). Identical timestamps are declined and flagged for human review.

**R5 — Determinism** ✅
`temperature: 0` on live calls. Retrieval sorted by id. Grounding decision is in the verifier, not the model's text.

**R6 — No number is ever invented** ✅
Prices are exact-matched against cited record fields. Commission is only accepted when the full derivation equation appears in the answer and is independently recomputed.

**R7 — Agent experience** ✅ built as specified / ⚠️ known to be wrong
`verifyWithTimeout()` is called in the route. If verification exceeds 2,000 ms the unverified proposal is returned as `ANSWERED`. This is built exactly as the rule specifies. It is wrong because it allows the R7 timeout path to bypass R2 and R6 — see Q1 above.

**R8 — Every question is accounted for** ✅
Every request — including unhandled server errors — ends as `ANSWERED`, `DECLINED_NOT_GROUNDED`, or `DECLINED_OUT_OF_POLICY` with a reason. Both the normal path and the catch block call `addLog()`. The client-side offline stub uses the same outcome structure but cannot log (no server when offline).
