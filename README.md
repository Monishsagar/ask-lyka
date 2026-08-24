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

## Live mode

Set `MODEL_PROVIDER=live`, `MODEL_API_KEY`, and optionally `MODEL_MODEL`. The live client uses OpenAI-compatible chat completions with temperature 0, while the same verifier remains authoritative.

```bash
MODEL_PROVIDER=live MODEL_API_KEY=your_key npm run dev
npm run questions
```

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
