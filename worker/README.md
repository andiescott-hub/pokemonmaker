# Creature Maker — generation worker

A small Cloudflare Worker that turns a child's drawing into a finished
creature image. It exists so the API keys stay **off** the public website:
the app is a static site on a public repo, so anything in its code can be
read by anyone.

What it does on each request:

1. **Claude Opus 5 (vision)** looks at the drawing and works out what
   creature the child meant to draw — returning a name, a description, and
   the concrete features to preserve.
2. **Gemini** renders the finished illustration from that description, with
   the child's own drawing passed in as a reference image so the result
   keeps their composition instead of inventing something new.

---

## Setting it up (all in a browser — no terminal)

### 1. Get the three API keys

| Key | Where |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `CLOUDFLARE_API_TOKEN` | [dash.cloudflare.com](https://dash.cloudflare.com) → My Profile → API Tokens → Create Token → use the **"Edit Cloudflare Workers"** template |

### 2. Add them to GitHub

Repo → **Settings** → **Secrets and variables** → **Actions** → the
**Secrets** tab → *New repository secret*. Add four:

- `CLOUDFLARE_API_TOKEN`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `ACCESS_CODE` — any phrase you invent, e.g. `couchtortoise`

### 3. Deploy

Repo → **Actions** tab → **Deploy worker** → *Run workflow*.

When it finishes, the log prints your worker URL — something like
`https://creature-maker.andrewscott.workers.dev`. Copy it.

### 4. Point the app at it

Same settings page as step 2, but the **Variables** tab this time →
*New repository variable*:

- `VITE_GENERATOR_URL` = the URL you just copied

That's it. The next push rebuilds the site against the worker. Until this
variable is set the app uses its offline preview generator, so it always
works either way.

### 5. Check it

Repo → **Actions** tab → **Test worker** → *Run workflow*.

It sends a test drawing through the whole pipeline and prints the creature
name, description and image size. If anything is misconfigured, the exact
API error appears in that log.

---

## Gemini image generation needs billing enabled

The Gemini **API** has no free tier for current image models. A key without
billing returns `429 … limit: 0`, which reads like a used-up quota but
actually means "not available on this plan". Enable billing on the Google AI
Studio project behind `GEMINI_API_KEY` and it works with no code change.
(The free images in the consumer Gemini app are a separate product.)

If the image step fails for any reason, the worker still returns Claude's
name and description with `image: null`, and the app shows the child's own
drawing instead. They always get a finished creature; the underlying error
goes to the browser console for you, not to them.

## Cost and abuse

Each creature is roughly one Claude vision call plus one Gemini image — a
few cents.

**The access code is not a real secret.** It gets compiled into the app's
public JavaScript, so anyone determined can read it. It only stops someone
who stumbles on the worker URL from casually hitting it. If you share the
app more widely, add a **Cloudflare rate-limit rule** on the worker route —
that is the actual protection. Rotate the code by changing the `ACCESS_CODE`
secret and re-running both workflows.

## Config

- `ALLOWED_ORIGIN` in `wrangler.toml` — the only site allowed to call the
  worker. Change it if the app moves.
- The `GEMINI` block at the top of `src/index.ts` holds the model id and the
  request/response shape — the one place to adjust if Google changes its API.

---

## Deploying from a terminal instead (optional)

Only if you'd rather work locally. **Run these one line at a time** and note
that each `wrangler` line is a complete command — do not paste any
explanatory text after it. (On macOS the default shell is zsh, which does
*not* treat `#` as a comment the way bash does, so a trailing comment gets
passed to wrangler as arguments and the command fails.)

```bash
git clone https://github.com/andiescott-hub/pokemonmaker.git
cd pokemonmaker/worker
npm install
npx wrangler login
```

Then set each secret. Each command prompts you to paste the value:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ACCESS_CODE
npx wrangler deploy
```

Check it, using the URL that `deploy` printed:

```bash
node test-local.mjs https://creature-maker.YOURNAME.workers.dev YOUR_ACCESS_CODE
```

If wrangler reports a permission error mentioning a path outside this
project (for example `~/.Trash`), it is running from the wrong folder —
`cd` into the `worker` directory of the clone and try again.
