# Creature Maker — generation worker

A tiny Cloudflare Worker that turns a child's drawing into a finished
creature image. It exists so the API keys stay **off** the public website:
the app is a static site on a public repo, so anything in its code is
readable by anyone.

What it does on each request:

1. **Claude Opus 5 (vision)** looks at the drawing and works out what
   creature the child meant to draw — returning a name, a description, and
   the concrete features to preserve.
2. **Gemini** renders the finished illustration from that description, with
   the child's own drawing passed in as a reference image so the result
   keeps their composition instead of inventing something new.

## Deploy it (one time)

```bash
cd worker
npm install

# Log in to Cloudflare (opens a browser)
npx wrangler login

# Store the three secrets — these never go in the repo
npx wrangler secret put ANTHROPIC_API_KEY   # from console.anthropic.com
npx wrangler secret put GEMINI_API_KEY      # from aistudio.google.com/apikey
npx wrangler secret put ACCESS_CODE         # any phrase you invent

npx wrangler deploy
```

Deploy prints your worker URL, e.g. `https://creature-maker.<you>.workers.dev`.

## Check it works

```bash
node test-local.mjs https://creature-maker.<you>.workers.dev <your-access-code>
```

It sends a test drawing and prints the creature name, description, and image
size. If something's wrong it prints the exact API error — paste that back to
Claude to get it fixed.

## Point the app at it

Add two **repository variables** on GitHub (Settings → Secrets and variables
→ Actions → Variables):

| Name | Value |
|---|---|
| `VITE_GENERATOR_URL` | your worker URL |
| `VITE_ACCESS_CODE` | the access code you chose |

The next push rebuilds the site against the worker. Until those are set the
app falls back to the offline preview generator, so it always works.

## Cost and abuse

Each creature ≈ one Claude vision call + one Gemini image — a few cents.
The access code stops strangers who find the site from spending your credit.
Add a Cloudflare rate limit rule on the worker route before sharing the URL
more widely, and rotate the code with `wrangler secret put ACCESS_CODE` if it
ever leaks.

## Config

- `ALLOWED_ORIGIN` in `wrangler.toml` — the only site allowed to call the
  worker. Change it if the app moves.
- The `GEMINI` block at the top of `src/index.ts` holds the model id and
  request/response shape — the one place to adjust if Google changes its API.
