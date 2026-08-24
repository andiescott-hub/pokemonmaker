# Handoff: Creature Maker (iPad app)

## Overview
An iPad app where a child sketches an original creature, paints it, gives it up to 3 elemental powers, decorates it with objects from a searchable library, then has an on-device AI combine everything into one finished "Pokémon-style" creature image. Finished creatures are submitted into a Poké Ball and collected in a Home gallery.

## About the Design Files
The bundled file (`wireframes.dc.html`) is a **design reference created in HTML** — low-fidelity wireframes sketching structure, flow and content, not production code to copy directly. Open it in a browser to review the screens (pan/zoom canvas — each screen is a hand-drawn iPad frame). The task is to **recreate this flow in the target codebase's actual environment** (SwiftUI/UIKit for a native iPad app is likely the right call here, given this is described as an iPad app; use whatever the existing codebase already uses if there is one) using that environment's own components and patterns — not to embed or ship this HTML.

## Fidelity
**Low-fidelity (lofi).** These are structural wireframes: hand-drawn boxes, placeholder icons (two-letter labels instead of real iconography), and no final color palette, typography, or spacing system. Use them as a guide for **screens, layout structure, navigation and functionality only**. Apply the target app's own (or a newly chosen) visual design system for all actual styling — colors, type, iconography, spacing, corner radii, elevation.

## Flow
Two top-level tabs: **Create** and **Home**.

Create is a single persistent canvas with a bottom mode dock of 5 modes, moved through in any order (not a forced wizard): **Sketch → Paint → Powers → Shapes → Finish**. Home is a gallery of every creature the user has submitted so far, each shown as a Poké Ball.

## Screens / Views

### 1. Sketch
- **Purpose**: freehand-draw the creature's outline. Can be any invented creature — not necessarily an animal (a "tortoise with four arms" was the founders' own example).
- **Layout**: full-bleed canvas area filling most of the screen; bottom dock bar with 5 mode icons (Sketch active); a small persistent mic button top-right for voice commands (see AI section).
- **Components**: pencil tool (default/only tool on this screen); canvas surface.
- **Interaction — undo/redo gesture**: press and hold a finger down on a stroke you want to remove — it disappears (acts as undo for that stroke). If you let go before deciding, holding on it again removes it. Holding again on a removed stroke's location restores it (redo). This is a direct-manipulation undo, not a separate undo button.

### 2. Paint
- **Purpose**: color in the sketch.
- **Layout**: same canvas, dock now shows Paint active; a row of color swatches appears above the dock; paintbrush/fill tool.
- **Components**: color swatch picker (5+ colors shown in wireframe, expand as needed), fill/paint-bucket tool.
- **Behavior — spill correction**: if the user paints outside the sketch's outline, the app automatically detects the sketch boundary and corrects the fill back inside the lines (auto-clamps flood-fill to the enclosed region rather than leaking into the background). This should read as "it just fixes it" — no error state, no user action needed.

### 3. Powers
- **Purpose**: assign elemental powers to the creature.
- **Layout**: canvas shows a highlighted "chest" hotspot on the creature (a dashed circle marking the drop/assignment zone) with a slot count indicator; below, a row/grid of power chips.
- **Power list**: Water, Fire, Strong (Earth), Wind, Animal, Electricity, Venom (Poison). (Names came directly from the source conversation — keep this exact set unless the user says otherwise.)
- **Rule**: exactly 3 powers must be chosen per creature — not fewer, not more. When exactly 3 are selected, power is split evenly across all 3 (no weighting between chosen powers).
- **State**: selected chips are visually distinct (highlighted/filled); once 3 are selected, further taps on unselected chips should be disabled or prompt de-selecting one first.

### 4. Shapes (decorate + library)
- **Purpose**: attach non-animal objects/shapes to the creature (e.g. a sofa becomes a back the creature can "sit on", with the sofa's own legs removed automatically when attached).
- **Layout**: canvas + a bottom tray/shelf of draggable object thumbnails; tapping "browse" (or the tray itself) opens the full library screen.
- **Library screen**: a search bar at top with an inline mic icon for voice search ("say 'couch' or 'something to sit on'" — filters live as the user speaks); below, objects are organized into named categories: **Furniture** (sofa, chair, table, lamp), **Everyday objects** (hat, box, umbrella, bag), **Nature** (rock, tree, cloud, leaf), **Shapes & misc** (triangle, star, gear, balloon). This is a representative starter set, not exhaustive — the library should be able to grow. **No animals are ever in this library** — animals/creatures are only produced via the Sketch tool, never dragged in as a pre-made object.
- **Voice search behavior**: search matches by description as well as by name (e.g. "something to sit on, kind of soft" → returns sofa, bean bag, cushion) — this implies semantic/fuzzy matching, not literal string search only.
- **Attaching an object**: dragging an object onto the creature is a manual placement gesture; getting the object to merge naturally (e.g. sofa's legs disappearing, creature sitting on its back) is done via the AI voice command below, not by drag alone.

### 5. Finish (AI generate)
- **Purpose**: combine the raw sketch + paint + attached shapes + chosen powers into one polished, finished creature image using generative AI.
- **Layout**: canvas shows the combined creature with an "AI generated" badge; caption explaining what happened; two actions below: **Regenerate** (secondary) and **Submit** (primary).
- **Behavior**: this is a generative step, not a simple merge — treat it as a call to an image-generation model that takes the user's raw drawing layers + selected powers as input/prompt context and outputs one finished illustration. Needs a loading/thinking state (not yet wireframed — flag as an open item, see below).
- **Submit**: sends the finished creature into a Poké Ball and adds it to the Home gallery; likely also locks the creature from further editing (open question — see below).

### 6. Voice / AI command ("bring to life")
- **Purpose**: a general-purpose natural-language voice command that can restructure/merge objects on the canvas, not just generate the final image (e.g. "make the couch's legs disappear and sit it on its back").
- **Layout**: mic button, a dashed speech-bubble showing the live transcript of what was heard, a "Done ✓" confirmation once the command has been applied.
- **Scope**: available as a persistent top-right mic icon during Sketch/Paint/Powers/Shapes for ad hoc object-merging commands, and as the dedicated flow on the Finish screen for the final full-creature generation. Both should reuse the same voice-command component.

### 7. Home
- **Purpose**: gallery of every creature the user has submitted.
- **Layout**: grid of Poké Ball icons (filled circle, red top half, white bottom half, black dividing line, small center button — the classic Poké Ball glyph), one per submitted creature, plus empty/dashed placeholder slots for future creatures.
- **Interaction**: tapping a filled Poké Ball opens that creature (screen not yet wireframed — flag as open item).

## Interactions & Behavior summary
- Hold-to-remove / hold-again-to-restore gesture for undo/redo of individual strokes (Sketch/Paint).
- Auto-correcting flood fill that won't leak past the sketch outline (Paint).
- Hard constraint: exactly 3 powers per creature, evenly weighted (Powers).
- Voice search with semantic matching over the object library (Shapes).
- Natural-language voice commands that restructure/merge canvas objects (persistent mic + Finish screen).
- Generative AI step that produces one finished image from all prior layers (Finish).
- Submit → Poké Ball → Home gallery, collection model (Home).

## State Management
Suggested state to track per in-progress creature:
- Sketch: vector/stroke history (needed for hold-to-undo/redo), a way to mark strokes as removed vs present.
- Paint: per-region fill colors, clamped to sketch-enclosed regions.
- Powers: array of exactly 3 selected power ids (or empty until complete); Submit/Finish should be gated until exactly 3 are chosen.
- Shapes: list of attached objects with position/anchor data, plus any voice-command-driven merge transforms applied to them.
- Finish: generation status (idle / generating / generated / error), the generated image asset, regenerate count.
- Home: array of submitted creatures (each with its generated image + powers + timestamp) — this is the persisted "collection."

## Design Tokens
None specified — this is a lofi wireframe with no final visual system. The wireframe's own sketch styling (hand-drawn font, black ink, one red-orange accent for AI/voice callouts) is a wireframe convention only and should **not** be carried into the real build. Pick or reuse the target codebase's real design tokens (color, type, spacing, corner radius, elevation).

## Assets
No real assets — all icons in the wireframe are text-label placeholders (e.g. "Pn", "Br", "Pw", "Sh", "Fin", "Mic") standing in for real iconography to be designed/sourced during implementation. The Poké Ball glyph is the one semi-finished shape (a simple two-tone circle) and can be used as a rough reference for the real icon.

## Open items / questions for the next design pass
- Loading/"thinking" state for the AI generate step (Finish) — not yet designed.
- What tapping a creature in the Home gallery opens (a detail/reveal screen) — not yet designed.
- Whether Submit locks the creature from further edits, or whether creatures can be revised after submission.
- Real iconography, color palette, and typography — none has been chosen yet; this wireframe intentionally avoids prescribing any.
- How many powers exist in total and whether the list of 7 (Water, Fire, Strong, Wind, Animal, Electricity, Venom) is final or a starting set.

## Files
- `wireframes.dc.html` — all wireframe screens described above, laid out as a pannable/zoomable board. Open directly in a browser.
- `screenshots/3a-full-flow.png` — the chosen Create flow: Sketch → Paint → Powers → Shapes → Finish → Home.
- `screenshots/4a-object-library.png` — the object library + voice search screens.
- `screenshots/1a-dock-flow.png`, `1b-wizard-flow.png`, `1c-workspace-flow.png` — earlier structural alternatives considered for the Create flow (not chosen, kept for reference).
- `screenshots/2a-home-tab.png`, `2b-home-shelf.png` — earlier alternatives considered for Home (not chosen, kept for reference).
