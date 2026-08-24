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

## Live mode (optional, not configured)

This project is intentionally configured to run in deterministic stub mode with no integrations, environment variables, or external scripts. Live OpenRouter/model access is not enabled; adding it later would require a provider adapter and environment variables, while keeping the same verifier authoritative.

For the current submission, do not set `MODEL_PROVIDER=live`. The default stub path is offline and deterministic.

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
