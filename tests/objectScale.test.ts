import { beforeEach, describe, expect, it } from 'vitest'
import { resizeGeometry } from '../src/components/CreatureCanvas'
import { useAppStore, loadPersisted } from '../src/store'
import { CANVAS_H, CANVAS_W, MAX_SCALE, MIN_SCALE, OBJECT_SIZE, clampScale } from '../src/utils/render'
import { emptyDraft } from '../src/types'

beforeEach(() => {
  useAppStore.setState({ draft: emptyDraft(), submitted: [], tab: 'create', mode: 'shapes' })
})

const state = () => useAppStore.getState()

describe('scale limits', () => {
  it('holds the bounds at both ends and leaves sizes between them alone', () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE)
    expect(clampScale(99)).toBe(MAX_SCALE)
    expect(clampScale(1)).toBe(1)
    expect(clampScale(2.5)).toBe(2.5)
  })

  it('cannot be walked past the limits by repeated steps', () => {
    let scale = 1
    for (let i = 0; i < 40; i++) scale = clampScale(scale * 1.25)
    expect(scale).toBe(MAX_SCALE)
    for (let i = 0; i < 40; i++) scale = clampScale(scale / 1.25)
    expect(scale).toBe(MIN_SCALE)
  })
})

describe('resize controls geometry', () => {
  const centre = { x: 500, y: 300 }

  it('grows the ring with the shape, keeping the handle on it', () => {
    const small = resizeGeometry(centre, 1)
    const large = resizeGeometry(centre, 3)
    expect(large.ring).toBeGreaterThan(small.ring)
    // The handle sits on the ring, down and to the right of the shape.
    const offset = Math.hypot(large.handle.x - centre.x, large.handle.y - centre.y)
    expect(offset).toBeCloseTo(large.ring, 5)
    expect(large.handle.x).toBeGreaterThan(centre.x)
    expect(large.handle.y).toBeGreaterThan(centre.y)
    expect(large.ring).toBeGreaterThan((OBJECT_SIZE * 3) / 2)
  })

  it('puts the buttons above the shape, and flips them below near the top edge', () => {
    expect(resizeGeometry(centre, 1).shrink.y).toBeLessThan(centre.y)
    const highUp = { x: 500, y: 40 }
    expect(resizeGeometry(highUp, 1).shrink.y).toBeGreaterThan(highUp.y)
  })

  it('keeps every control inside the canvas, wherever the shape sits', () => {
    const corners = [
      { x: 0, y: 0 },
      { x: CANVAS_W, y: 0 },
      { x: 0, y: CANVAS_H },
      { x: CANVAS_W, y: CANVAS_H },
    ]
    for (const corner of corners) {
      const { shrink, grow } = resizeGeometry(corner, MAX_SCALE)
      for (const button of [shrink, grow]) {
        expect(button.x).toBeGreaterThanOrEqual(0)
        expect(button.x).toBeLessThanOrEqual(CANVAS_W)
        expect(button.y).toBeGreaterThanOrEqual(0)
        expect(button.y).toBeLessThanOrEqual(CANVAS_H)
      }
    }
  })
})

describe('resizing a placed object', () => {
  it('scales the object it was told to, and no other', () => {
    state().placeObject('sofa', { x: 100, y: 100 })
    state().placeObject('flame', { x: 300, y: 300 })
    const [sofa, flame] = state().draft.objects
    state().updateObject(flame.id, { scale: 2.5 })
    expect(state().draft.objects[1].scale).toBe(2.5)
    expect(state().draft.objects[0].scale).toBe(1)
    expect(state().draft.objects[0].id).toBe(sofa.id)
  })

  it('keeps the new size through a reload', () => {
    state().placeObject('sofa', { x: 100, y: 100 })
    state().updateObject(state().draft.objects[0].id, { scale: 3 })
    const stored: Record<string, string> = {
      'creature-maker-v1': JSON.stringify({ draft: state().draft, submitted: [] }),
    }
    const restored = loadPersisted({ getItem: (k: string) => stored[k] ?? null })
    expect(restored.draft.objects[0].scale).toBe(3)
  })
})
