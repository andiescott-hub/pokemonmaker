# Creature Maker

An iPad-first web app where a child sketches an original creature, paints it,
gives it exactly 3 elemental powers, decorates it with objects from a
searchable library, then has AI combine everything into one finished
"Pokémon-style" creature. Finished creatures are submitted into a Poké Ball
and collected in a Home gallery.

Built as an **installable PWA** (React + TypeScript + Vite) so it runs
full-screen on an iPad from Safari's *Add to Home Screen* — no App Store
needed. The original design handoff (wireframes + spec) lives in
[`design/`](design/README.md).

## Try it on an iPad

The app deploys automatically to **https://andiescott-hub.github.io/pokemonmaker/**
on every push (see `.github/workflows/deploy.yml`). On the iPad, open that
URL in Safari, then **Share → Add to Home Screen** — it launches
full-screen like a native app, with mic access (HTTPS) and offline support.

## Run it

```bash
npm install
npm run dev        # dev server (visit the printed URL; add --host to test on an iPad on the same network)
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
npm test           # unit tests (Vitest)
npm run test:e2e   # full-flow smoke test in headless Chromium (build first)
```

To try it on an iPad: `npm run dev`, open the network URL in Safari, then
*Share → Add to Home Screen* for the full-screen experience.

## The flow

Two tabs: **Create** and **Home**. Create is one persistent canvas with a
bottom dock of 5 modes, usable in any order (not a wizard):

| Mode | What happens |
|---|---|
| ✏️ **Sketch** | Freehand-draw the creature. **Hold a stroke ~½s to undo it; hold again to bring it back** — the handoff's direct-manipulation undo. |
| 🧽 **Rubber** | Always available on the canvas: tap or swipe to remove lines, colour and objects (topmost first). Added after iPad testing — the hold gesture alone wasn't enough, and fills/objects previously couldn't be removed at all. **Start over** wipes the canvas, behind a two-tap confirm. |
| 🖌️ **Paint** | Tap inside the sketch to flood-fill. Paint outside the lines? The fill detects the sketch boundary and snaps back inside on its own (gap-closing + leak detection — see `src/utils/floodFill.ts`). |
| ⚡ **Powers** | Pick **exactly 3** of 7 powers (Water, Fire, Strong, Wind, Animal, Electricity, Venom). Power splits evenly. A dashed "chest" hotspot on the creature shows the slot count. |
| 🧩 **Shapes** | Drag objects from the tray onto the creature, or browse the full library. Search matches **descriptions, not just names** ("something to sit on, kind of soft" → sofa, bean bag, cushion), with voice search via the inline mic. **No animals in the library, ever** — creatures come from the Sketch tool only. |
| ✨ **Finish** | **Claude looks at the drawing** and works out what creature the child meant to draw, then **Gemini renders a finished illustration** from that reading — using their drawing as a reference so it keeps their composition. The child sees the creature's name and description alongside it. Regenerate or Submit → the creature lands as a Poké Ball in Home. |

A persistent top-right mic accepts natural-language commands during any
Create mode ("sit the couch on its back") — the same voice component the
Finish flow uses.

## The AI generation step

Submitting runs a two-model pipeline inside a **Cloudflare Worker** (see
[`worker/`](worker/README.md)) — the worker exists so the API keys stay off
this public site:

1. **Claude Opus 5 (vision)** reads the drawing and returns a name, a
   description, and the concrete features to preserve.
2. **Gemini** renders the finished illustration from that description, with
   the child's drawing attached as a reference image.

Until you deploy the worker and set `VITE_GENERATOR_URL`, the app falls back
to an offline preview generator, so dev, tests and offline use always work.
Deployment is three commands — see [`worker/README.md`](worker/README.md).

Still stubbed:

- **`src/services/commands.ts`** — `interpretCommand(transcript, draft)`.
  Currently keyword-matches a few demo intents (merge / bigger / smaller).
  Swap for an LLM call that returns canvas operations (e.g. Claude with a
  tool schema).
- **`src/data/objects.ts` → `searchObjects()`** — word-overlap matching over
  names + description keywords. Swap for embedding/semantic search when the
  library grows.
- **`src/services/voice.ts`** — Web Speech API wrapper, feature-detected;
  every voice entry point falls back to typed input on unsupported browsers.

## Architecture

```
src/
  types.ts               core model: Stroke, Fill, PowerId, PlacedObject, CreatureDraft…
  store.ts               Zustand store + localStorage persistence (draft + collection)
  data/                  powers list, object library + search
  services/              generation (calls the worker) + voice/command stubs
  config.ts              generator URL + access code from build-time env
  utils/floodFill.ts     pure spill-corrected flood fill (unit-tested)
  utils/render.ts        canvas compositing shared by Paint layer + generation stub
  components/            one component per wireframed screen/region
public/                  PWA manifest, service worker, Poké Ball icons
design/                  original wireframe handoff (spec of record)
tests/                   Vitest unit tests
e2e/smoke.mjs            headless full-flow smoke test
worker/                  Cloudflare Worker: Claude vision + Gemini image generation
```

## Open questions carried from the handoff

- Is the 7-power list final?
- What should tapping a Poké Ball in Home show? (Currently a simple detail
  modal: image + name + description + powers + date.)
- Does Submit lock the creature? (Current choice: yes — submitting starts a
  fresh draft; submitted creatures are read-only.)
- Real iconography/typography: current styling is a first-pass kid-friendly
  system (warm paper, coral accent, emoji icons) meant to be replaced by a
  real art pass.
