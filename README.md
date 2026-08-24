# Ask Lyka

Grounded real-estate answers verified against a fixed 12-row listing register.

## Setup

```bash
npm install
```

## Stub mode

```bash
npm run dev
npm run questions
```

Stub mode uses no environment variables or network. The runner targets `http://localhost:3000` by default.

## Real mode (OpenRouter)

```bash
MODEL_PROVIDER=live
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free   # optional — this is the default
npm run dev
npm run questions
```

`OPENROUTER_MODEL` defaults to `meta-llama/llama-3.1-8b-instruct:free` (free tier, no balance required).
Swap to any OpenRouter model id via env var alone — no code change needed.

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
| `OPENROUTER_MODEL` | live mode only | optional; defaults to free-tier llama |
| `SUPABASE_URL` | persistent log | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | persistent log | Settings → API → service_role (server-only) |

## Tests

```bash
npm test
```

The grounding verifier is in `lib/verify.ts`, particularly `verify()` where every extracted claim is exact-matched against cited fields.

## Routes

- `/` Ask Lyka interface
- `/log` in-memory audit table
- `POST /api/ask` and `GET /api/log`

Determinism is closed by exact matching, sorted retrieval, explicit recency tie declines, and temperature 0 in live mode. The R7 timeout race is intentionally implemented as the one wall-clock leak and is unsafe because it can briefly expose an unverified guess.
