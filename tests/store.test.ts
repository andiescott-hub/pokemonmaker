import { beforeEach, describe, expect, it } from 'vitest'
import { loadPersisted, useAppStore } from '../src/store'
import { REQUIRED_POWERS, emptyDraft } from '../src/types'

beforeEach(() => {
  useAppStore.setState({ draft: emptyDraft(), submitted: [], tab: 'create', mode: 'sketch' })
})

const state = () => useAppStore.getState()

describe('powers rule — exactly 3, evenly split', () => {
  it('allows selecting up to exactly REQUIRED_POWERS powers', () => {
    state().togglePower('water')
    state().togglePower('fire')
    state().togglePower('venom')
    expect(state().draft.powers).toEqual(['water', 'fire', 'venom'])
    // A 4th selection is ignored.
    state().togglePower('wind')
    expect(state().draft.powers).toHaveLength(REQUIRED_POWERS)
    expect(state().draft.powers).not.toContain('wind')
  })

  it('deselecting frees a slot', () => {
    state().togglePower('water')
    state().togglePower('fire')
    state().togglePower('venom')
    state().togglePower('fire')
    expect(state().draft.powers).toEqual(['water', 'venom'])
    state().togglePower('wind')
    expect(state().draft.powers).toContain('wind')
  })
})

describe('hold-to-undo stroke toggling', () => {
  it('marks a stroke removed, then restores it on a second toggle', () => {
    state().addStroke([
      { x: 10, y: 10 },
      { x: 50, y: 50 },
    ])
    const strokeId = state().draft.strokes[0].id
    state().toggleStroke(strokeId)
    expect(state().draft.strokes[0].removed).toBe(true)
    state().toggleStroke(strokeId)
    expect(state().draft.strokes[0].removed).toBe(false)
  })
})

describe('eraser', () => {
  it('erases a stroke outright — unlike the hold gesture, it does not toggle back', () => {
    state().addStroke([{ x: 10, y: 10 }])
    const strokeId = state().draft.strokes[0].id
    state().eraseStroke(strokeId)
    expect(state().draft.strokes[0].removed).toBe(true)
    state().eraseStroke(strokeId)
    expect(state().draft.strokes[0].removed).toBe(true)
  })

  it('removes a fill', () => {
    state().addFill({ x: 20, y: 20 }, '#ff0000')
    state().addFill({ x: 40, y: 40 }, '#00ff00')
    const [first, second] = state().draft.fills
    state().removeFill(first.id)
    expect(state().draft.fills).toHaveLength(1)
    expect(state().draft.fills[0].id).toBe(second.id)
  })

  it('removes a placed object', () => {
    state().placeObject('sofa', { x: 50, y: 50 })
    const placedId = state().draft.objects[0].id
    state().removeObject(placedId)
    expect(state().draft.objects).toHaveLength(0)
  })

  it('start over clears strokes, fills, objects and powers', () => {
    state().addStroke([{ x: 1, y: 1 }])
    state().addFill({ x: 2, y: 2 }, '#ff0000')
    state().placeObject('sofa', { x: 3, y: 3 })
    state().togglePower('fire')
    state().startNewCreature()
    const { strokes, fills, objects, powers } = state().draft
    expect([strokes.length, fills.length, objects.length, powers.length]).toEqual([0, 0, 0, 0])
  })
})

describe('submit', () => {
  const makeReady = () => {
    state().addStroke([
      { x: 10, y: 10 },
      { x: 50, y: 50 },
    ])
    state().togglePower('water')
    state().togglePower('fire')
    state().togglePower('venom')
    state().setGeneration('generated', 'data:image/png;base64,xxx')
  }

  it('is blocked until the creature has been generated with exactly 3 powers', () => {
    state().submitCreature()
    expect(state().submitted).toHaveLength(0)
  })

  it('moves the creature into the collection and starts a fresh draft', () => {
    makeReady()
    state().submitCreature()
    expect(state().submitted).toHaveLength(1)
    expect(state().submitted[0].powers).toEqual(['water', 'fire', 'venom'])
    expect(state().draft.strokes).toHaveLength(0)
    expect(state().draft.generationStatus).toBe('idle')
  })
})

describe('persistence', () => {
  it('round-trips draft and collection through storage JSON', () => {
    const stored: Record<string, string> = {}
    const fakeStorage = { getItem: (k: string) => stored[k] ?? null }
    const before = loadPersisted(fakeStorage)
    expect(before.submitted).toEqual([])

    stored['creature-maker-v1'] = JSON.stringify({
      draft: { ...emptyDraft(), powers: ['fire'] },
      submitted: [{ id: 'c1', image: 'data:x', powers: ['water', 'fire', 'venom'], submittedAt: 1 }],
    })
    const after = loadPersisted(fakeStorage)
    expect(after.draft.powers).toEqual(['fire'])
    expect(after.submitted).toHaveLength(1)
  })

  it('falls back to an empty state on corrupt storage', () => {
    const fakeStorage = { getItem: () => '{not json' }
    const result = loadPersisted(fakeStorage)
    expect(result.draft.strokes).toEqual([])
    expect(result.submitted).toEqual([])
  })
})
