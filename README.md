# Ask Lyka

Grounded real-estate answers verified against a fixed 12-row listing register.

## Setup

```bash
pnpm install
```

## Stub mode

```bash
pnpm dev
pnpm run questions
```

Stub mode uses no environment variables or network. The runner targets `http://localhost:3000` by default.

## Real mode (OpenRouter)

```bash
MODEL_PROVIDER=live
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openrouter/auto   # optional — OpenRouter picks the best available model
pnpm dev
pnpm run questions
```

`OPENROUTER_MODEL` defaults to `openrouter/auto` (OpenRouter selects the best free model automatically).
Swap to any OpenRouter model id via env var alone — no code change needed.

## Offline fallback

When the deployed app cannot reach the server (e.g. the browser is offline or Vercel is unreachable),
the full retrieve → stub-propose → verify pipeline runs entirely in the browser via `lib/client-stub.ts`.
Results are shown with an **⚡ offline · stub** mode badge. No extra configuration needed.

## Persistent log (Supabase)

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/migrations/0001_question_log.sql`.
3. Copy `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from **Project Settings → API**.
4. Add them to `.env.local` (or Vercel project settings for production).

Without these two env vars the app automatically uses the in-memory log — no code change needed to fall back.

## Vercel env vars

| Variable | Required for | Notes |
|---|---|---|
| `MODEL_PROVIDER` | switching modes | `stub` (default) or `live` |
| `OPENROUTER_API_KEY` | live mode only | from openrouter.ai |
| `OPENROUTER_MODEL` | live mode only | optional; defaults to `openrouter/auto` |
| `SUPABASE_URL` | persistent log | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | persistent log | Settings → API → service_role (server-only) |

## Tests

```bash
pnpm test
```

The grounding verifier is in `lib/verify.ts`, particularly `verify()` where every extracted claim is
exact-matched against cited fields. Status words that appear only in negated contexts (e.g. "not Available")
are skipped and not treated as claims, preventing false `DECLINED_NOT_GROUNDED` responses.

## Routes

- `/` Ask Lyka interface
- `/log` audit table (in-memory or Supabase)
- `POST /api/ask` and `GET /api/log`

Determinism is closed by exact matching, sorted retrieval, explicit recency tie declines, and temperature 0 in live mode. The R7 timeout race is intentionally implemented as the one wall-clock leak and is unsafe because it can briefly expose an unverified guess.
