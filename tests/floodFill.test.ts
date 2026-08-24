import { describe, expect, it } from 'vitest'
import { correctedFill, dilate, floodFill } from '../src/utils/floodFill'

const W = 40
const H = 40
const size = { width: W, height: H }

/** Draw a rectangle outline into a barrier mask, optionally with a gap. */
function rectOutline(gapAt?: { x: number; y: number }): Uint8Array {
  const mask = new Uint8Array(W * H)
  for (let x = 5; x <= 34; x++) {
    mask[5 * W + x] = 1
    mask[34 * W + x] = 1
  }
  for (let y = 5; y <= 34; y++) {
    mask[y * W + 5] = 1
    mask[y * W + 34] = 1
  }
  if (gapAt) mask[gapAt.y * W + gapAt.x] = 0
  return mask
}

describe('floodFill', () => {
  it('fills an enclosed region without leaking', () => {
    const result = floodFill(rectOutline(), size, 20, 20)
    expect(result.leaked).toBe(false)
    expect(result.filledPixels).toBe(28 * 28)
    expect(result.region[20 * W + 20]).toBe(1)
    expect(result.region[0]).toBe(0)
  })

  it('reports a leak when the seed is outside every enclosed region', () => {
    const result = floodFill(rectOutline(), size, 1, 1)
    expect(result.leaked).toBe(true)
  })

  it('does not fill when the seed lands on a barrier', () => {
    const result = floodFill(rectOutline(), size, 5, 20)
    expect(result.filledPixels).toBe(0)
  })
})

describe('dilate', () => {
  it('thickens a mask', () => {
    const mask = new Uint8Array(W * H)
    mask[20 * W + 20] = 1
    const grown = dilate(mask, size, 1)
    expect(grown[20 * W + 20]).toBe(1)
    expect(grown[19 * W + 19]).toBe(1)
    expect(grown[21 * W + 21]).toBe(1)
    expect(grown[17 * W + 17]).toBe(0)
  })
})

describe('correctedFill (spill correction)', () => {
  it('closes small outline gaps so the fill stays inside the lines', () => {
    const leakyOutline = rectOutline({ x: 20, y: 5 })
    // A plain flood fill leaks out through the gap…
    expect(floodFill(leakyOutline, size, 20, 20).leaked).toBe(true)
    // …but the corrected fill closes the gap and stays inside.
    const corrected = correctedFill(leakyOutline, size, 20, 20)
    expect(corrected.leaked).toBe(false)
    expect(corrected.filledPixels).toBeGreaterThan(0)
    expect(corrected.region[2 * W + 2]).toBe(0)
  })

  it('paints nothing when the tap is genuinely outside the sketch', () => {
    const corrected = correctedFill(rectOutline(), size, 1, 1)
    expect(corrected.filledPixels).toBe(0)
  })

  it('fills a shape with a wide gap, like an open mouth', () => {
    // A 20px hole is far too wide for small gap-closing, and was the
    // real-world failure: a drawn crocodile with its mouth open painted
    // nothing at all.
    const wideOpen = new Uint8Array(W * H)
    for (let x = 5; x <= 34; x++) {
      wideOpen[5 * W + x] = 1
      wideOpen[34 * W + x] = 1
    }
    for (let y = 5; y <= 34; y++) {
      if (y < 12 || y > 27) wideOpen[y * W + 5] = 1 // 16px gap in the left wall
      wideOpen[y * W + 34] = 1
    }
    expect(floodFill(wideOpen, size, 20, 20).leaked).toBe(true)

    const corrected = correctedFill(wideOpen, size, 20, 20)
    expect(corrected.leaked).toBe(false)
    expect(corrected.filledPixels).toBeGreaterThan(500)
    expect(corrected.region[1 * W + 1]).toBe(0) // no escape to the background
  })

  it('gives back the margin that gap-closing eats, and never paints over a stroke', () => {
    const gappy = rectOutline({ x: 20, y: 5 })
    const corrected = correctedFill(gappy, size, 20, 20)
    const exact = floodFill(rectOutline(), size, 20, 20).filledPixels

    // Within a few percent of the true interior — not eroded by the
    // thickened barrier used to close the gap.
    expect(corrected.filledPixels).toBeGreaterThan(exact * 0.95)
    // The child's own lines stay visible underneath.
    for (let x = 5; x <= 34; x++) expect(corrected.region[5 * W + x]).toBe(0)
  })
})
