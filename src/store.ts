import { create } from 'zustand'
import {
  REQUIRED_POWERS,
  emptyDraft,
  type CreateMode,
  type CreatureDraft,
  type Fill,
  type PlacedObject,
  type Point,
  type PowerId,
  type Stroke,
  type SubmittedCreature,
  type Tab,
} from './types'

const STORAGE_KEY = 'creature-maker-v1'

interface PersistedState {
  draft: CreatureDraft
  submitted: SubmittedCreature[]
}

export interface AppState extends PersistedState {
  tab: Tab
  mode: CreateMode
  setTab: (tab: Tab) => void
  setMode: (mode: CreateMode) => void

  // Sketch
  addStroke: (points: Point[]) => void
  /** Hold-to-undo: toggles a stroke between removed and present. */
  toggleStroke: (strokeId: string) => void
  /** Eraser: removes a stroke outright (no restore-on-repeat). */
  eraseStroke: (strokeId: string) => void

  // Paint
  addFill: (seed: Point, color: string) => void
  removeFill: (fillId: string) => void

  // Powers — exactly REQUIRED_POWERS must be chosen; a 4th tap is ignored.
  togglePower: (power: PowerId) => void

  // Shapes
  placeObject: (objectId: string, position: Point) => void
  moveObject: (placedId: string, position: Point) => void
  removeObject: (placedId: string) => void
  updateObject: (placedId: string, patch: Partial<PlacedObject>) => void

  // Finish
  setGeneration: (
    status: CreatureDraft['generationStatus'],
    result?: { image: string; description: string; creatureName: string },
  ) => void
  bumpRegenerate: () => void
  submitCreature: () => void
  startNewCreature: () => void
}

let idCounter = 0
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++idCounter}`

export function loadPersisted(storage: Pick<Storage, 'getItem'> | null): PersistedState {
  const fallback: PersistedState = { draft: emptyDraft(), submitted: [] }
  if (!storage) return fallback
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    return {
      draft: { ...emptyDraft(), ...parsed.draft },
      submitted: Array.isArray(parsed.submitted) ? parsed.submitted : [],
    }
  } catch {
    return fallback
  }
}

function persist(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ draft: state.draft, submitted: state.submitted }))
  } catch {
    // Storage full or unavailable — the app keeps working in memory.
  }
}

const initial = loadPersisted(typeof localStorage === 'undefined' ? null : localStorage)

export const useAppStore = create<AppState>((set) => {
  const update = (fn: (state: AppState) => Partial<AppState>) =>
    set((state) => {
      const patch = fn(state)
      const next = { ...state, ...patch }
      persist(next)
      return patch
    })

  return {
    ...initial,
    tab: 'create',
    mode: 'sketch',

    setTab: (tab) => set({ tab }),
    setMode: (mode) => set({ mode }),

    addStroke: (points) =>
      update(({ draft }) => ({
        draft: {
          ...draft,
          strokes: [...draft.strokes, { id: nextId('stroke'), points, removed: false } satisfies Stroke],
        },
      })),

    toggleStroke: (strokeId) =>
      update(({ draft }) => ({
        draft: {
          ...draft,
          strokes: draft.strokes.map((s) => (s.id === strokeId ? { ...s, removed: !s.removed } : s)),
        },
      })),

    eraseStroke: (strokeId) =>
      update(({ draft }) => ({
        draft: {
          ...draft,
          strokes: draft.strokes.map((s) => (s.id === strokeId ? { ...s, removed: true } : s)),
        },
      })),

    addFill: (seed, color) =>
      update(({ draft }) => ({
        draft: {
          ...draft,
          fills: [...draft.fills, { id: nextId('fill'), seed, color } satisfies Fill],
        },
      })),

    removeFill: (fillId) =>
      update(({ draft }) => ({
        draft: { ...draft, fills: draft.fills.filter((f) => f.id !== fillId) },
      })),

    togglePower: (power) =>
      update(({ draft }) => {
        const selected = draft.powers
        if (selected.includes(power)) {
          return { draft: { ...draft, powers: selected.filter((p) => p !== power) } }
        }
        if (selected.length >= REQUIRED_POWERS) return {}
        return { draft: { ...draft, powers: [...selected, power] } }
      }),

    placeObject: (objectId, position) =>
      update(({ draft }) => ({
        draft: {
          ...draft,
          objects: [
            ...draft.objects,
            { id: nextId('obj'), objectId, position, scale: 1, merged: false } satisfies PlacedObject,
          ],
        },
      })),

    moveObject: (placedId, position) =>
      update(({ draft }) => ({
        draft: {
          ...draft,
          objects: draft.objects.map((o) => (o.id === placedId ? { ...o, position } : o)),
        },
      })),

    removeObject: (placedId) =>
      update(({ draft }) => ({
        draft: { ...draft, objects: draft.objects.filter((o) => o.id !== placedId) },
      })),

    updateObject: (placedId, patch) =>
      update(({ draft }) => ({
        draft: {
          ...draft,
          objects: draft.objects.map((o) => (o.id === placedId ? { ...o, ...patch } : o)),
        },
      })),

    setGeneration: (status, result) =>
      update(({ draft }) => ({
        draft: {
          ...draft,
          generationStatus: status,
          generatedImage: result ? result.image : draft.generatedImage,
          description: result ? result.description : draft.description,
          creatureName: result ? result.creatureName : draft.creatureName,
        },
      })),

    bumpRegenerate: () =>
      update(({ draft }) => ({ draft: { ...draft, regenerateCount: draft.regenerateCount + 1 } })),

    submitCreature: () =>
      update(({ draft, submitted }) => {
        if (draft.generationStatus !== 'generated' || !draft.generatedImage) return {}
        if (draft.powers.length !== REQUIRED_POWERS) return {}
        const creature: SubmittedCreature = {
          id: nextId('creature'),
          image: draft.generatedImage,
          powers: draft.powers,
          submittedAt: Date.now(),
          description: draft.description,
          creatureName: draft.creatureName,
        }
        // Submit locks the creature (handoff open question — current choice:
        // submitted creatures are read-only; a fresh draft starts).
        return { submitted: [...submitted, creature], draft: emptyDraft() }
      }),

    startNewCreature: () => update(() => ({ draft: emptyDraft() })),
  }
})

/** True when the draft satisfies the exactly-N powers rule. */
export const powersComplete = (powers: PowerId[]) => powers.length === REQUIRED_POWERS
