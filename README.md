# Dengue Yard Scan

Photograph a yard → a vision model reports water-holding containers → a pure-JS
scoring engine converts those detections into WHO-aligned dengue vector
surveillance indices (Container Index, House Index, Breteau Index) and a risk band.

The split matters: **the model is a sensor, the scoring engine is the contribution.**
The model never assesses risk, never gives advice, never computes a score.

## Layout

```
api/scan.js               Vercel serverless function. Holds ANTHROPIC_API_KEY and
                          the full system prompt. The only thing that talks to
                          api.anthropic.com.
src/lib/scoringEngine.js  Pure scoring module — zero dependencies, no I/O.
src/lib/scanClient.js     Browser → /api/scan (downscale, base64, POST).
src/lib/demoFixtures.js   Offline demo payloads for when venue wifi dies.
src/components/           UI.
docs/vision-prompt.md     Source of truth for the system prompt.
test/wiring.test.js       Smoke tests — including a byte-for-byte check that the
                          embedded prompt still matches the doc.
```

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and add your key:

```bash
cp .env.example .env
```

Never prefix the key with `VITE_` — anything `VITE_*` gets inlined into the
client bundle and is readable in devtools.

## Running

The frontend and the `/api` function are served by different tools. Use
`vercel dev` when you need the real endpoint:

```bash
npx vercel dev
```

Frontend only (the offline demo buttons work; `/api/scan` will 404):

```bash
npm run dev
```

Tests:

```bash
npm test
```

## The system prompt lives in two places

`docs/vision-prompt.md` is the source of truth. `api/scan.js` holds an embedded
copy in `SYSTEM_PROMPT`, because a serverless function can't reliably read a
markdown file from its bundle. **The test suite fails if the two drift**, so
edit the doc, then re-sync the constant.

## Deploying

### Vercel (primary target)

Push to a repo Vercel is watching, then set `ANTHROPIC_API_KEY` in the Vercel
project's environment variables. `vercel.json` gives `/api/scan` a 30s ceiling.

### Netlify (preview / device testing)

The same codebase also deploys to Netlify. Netlify does not run Vercel's
`(req, res)` handlers, so `netlify/functions/scan.mjs` adapts the request and
response shapes and delegates to the untouched `api/scan.js` — one handler, one
copy of the system prompt, two platforms. Its `config.path` pins it to
`/api/scan`, so the frontend fetch is identical either way.

```bash
npx netlify deploy --prod
```

`ANTHROPIC_API_KEY` must be set in the Netlify project's environment variables
(Project configuration → Environment variables). Without it every scan returns
502 `Vision service failed`; the rest of the app still works.

Netlify serves HTTPS, which is what makes `getUserMedia()` available — useful
for testing real camera capture on a phone, since `localhost` cannot.

## Notes on the API call

- Model is `claude-sonnet-4-6`, as specified in `docs/vision-prompt.md`.
- The prompt doc's "reliability trick" — an assistant-turn prefill of `{` —
  **returns a 400 on this model**; last-assistant-turn prefills were removed in
  the 4.6 family. `api/scan.js` uses structured outputs
  (`output_config.format` with a `json_schema`) instead, which does the same job
  and additionally enforces the field names and enums from the prompt.
- `safeParse()` is kept as a belt-and-braces guard around the response.
