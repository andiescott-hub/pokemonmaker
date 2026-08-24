/**
 * Pure flood-fill helpers behind the Paint mode's "spill correction".
 *
 * The behavior from the handoff: if the user paints outside the sketch's
 * outline, the app detects the boundary and corrects the fill back inside
 * the lines — no error state, no user action. Implementation:
 *
 * 1. Rasterized strokes act as fill barriers.
 * 2. The barrier mask is dilated to close small gaps in the outline, so a
 *    nearly-closed sketch still behaves as a closed region.
 * 3. If the filled region reaches the canvas border it "leaked" (the tap
 *    was outside every enclosed region) — retry with stronger gap-closing,
 *    and if it still leaks, fill nothing. Either way it reads as "the app
 *    just kept the paint inside the lines".
 *
 * All functions work on flat Uint8Array masks (1 = set) so they run in
 * Node for unit tests as well as against ImageData in the browser.
 */

export interface MaskSize {
  width: number
  height: number
}

/** Dilate a binary mask by `radius` using a square structuring element. */
export function dilate(mask: Uint8Array, { width, height }: MaskSize, radius: number): Uint8Array {
  if (radius <= 0) return mask.slice()
  const out = new Uint8Array(mask.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue
      const y0 = Math.max(0, y - radius)
      const y1 = Math.min(height - 1, y + radius)
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(width - 1, x + radius)
      for (let yy = y0; yy <= y1; yy++) {
        out.fill(1, yy * width + x0, yy * width + x1 + 1)
      }
    }
  }
  return out
}

export interface FloodResult {
  /** 1 for every pixel in the filled region (empty when the fill leaked). */
  region: Uint8Array
  /** True when the region reached the canvas border before correction. */
  leaked: boolean
  filledPixels: number
}

/** BFS flood fill from `seed`, stopped by `barriers`. */
export function floodFill(
  barriers: Uint8Array,
  size: MaskSize,
  seedX: number,
  seedY: number,
): FloodResult {
  const { width, height } = size
  const region = new Uint8Array(width * height)
  const sx = Math.round(seedX)
  const sy = Math.round(seedY)
  if (sx < 0 || sy < 0 || sx >= width || sy >= height || barriers[sy * width + sx]) {
    return { region, leaked: false, filledPixels: 0 }
  }
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  queue[tail++] = sy * width + sx
  region[sy * width + sx] = 1
  let leaked = false
  let filledPixels = 0
  while (head < tail) {
    const idx = queue[head++]
    filledPixels++
    const x = idx % width
    const y = (idx / width) | 0
    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) leaked = true
    const neighbors = [idx - 1, idx + 1, idx - width, idx + width]
    if (x === 0) neighbors[0] = -1
    if (x === width - 1) neighbors[1] = -1
    if (y === 0) neighbors[2] = -1
    if (y === height - 1) neighbors[3] = -1
    for (const n of neighbors) {
      if (n >= 0 && !region[n] && !barriers[n]) {
        region[n] = 1
        queue[tail++] = n
      }
    }
  }
  return { region, leaked, filledPixels }
}

/** Gap-closing radii tried in order, smallest first. 0 = no closing at all,
 * which is exact for an already-closed outline. The largest closes gaps of
 * roughly 2x its value. The largest handles a mouth left wide open across
 * a big drawing — measured at ~35ms on a full-size canvas, and only
 * reached when every smaller radius has failed. */
const CORRECTION_RADII = [0, 2, 4, 8, 14, 20, 28, 40]

const countSet = (mask: Uint8Array): number => {
  let n = 0
  for (let i = 0; i < mask.length; i++) if (mask[i]) n++
  return n
}

/**
 * Find a fillable pixel near the seed, searching only through the region
 * the child actually tapped in — it never crosses one of their strokes.
 *
 * This matters: closing gaps thickens the outline and can swallow a tap
 * made near a line. Recovering by simple proximity would let a tap in the
 * background jump *through* the outline and flood the creature's inside,
 * so the walk is confined by the original strokes.
 */
function nearestFreeInSameRegion(
  barriers: Uint8Array,
  closed: Uint8Array,
  { width, height }: MaskSize,
  seedX: number,
  seedY: number,
  maxSteps: number,
): [number, number] | null {
  const start = seedY * width + seedX
  if (barriers[start]) return null // tapped directly on a line
  if (!closed[start]) return [seedX, seedY]

  const seen = new Uint8Array(width * height)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0
  let steps = 0
  let levelEnd = 1
  queue[tail++] = start
  seen[start] = 1

  while (head < tail && steps <= maxSteps) {
    const idx = queue[head++]
    if (!closed[idx]) return [idx % width, (idx / width) | 0]
    const x = idx % width
    const y = (idx / width) | 0
    if (x > 0) push(idx - 1)
    if (x < width - 1) push(idx + 1)
    if (y > 0) push(idx - width)
    if (y < height - 1) push(idx + width)
    if (head === levelEnd) {
      steps++
      levelEnd = tail
    }
  }
  return null

  function push(n: number) {
    if (!seen[n] && !barriers[n]) {
      seen[n] = 1
      queue[tail++] = n
    }
  }
}

/**
 * Spill-corrected fill: a morphological closing.
 *
 * Thickening the outline closes gaps so paint can't escape through an open
 * mouth or a join between a leg and a body — but it also eats into the
 * fill. So after a successful fill the region is grown back by the same
 * radius and clipped to the real strokes, which restores the lost margin
 * without painting over the child's lines.
 *
 * Only if every radius still leaks does it paint nothing.
 */
export function correctedFill(
  barriers: Uint8Array,
  size: MaskSize,
  seedX: number,
  seedY: number,
): FloodResult {
  const sx = Math.round(seedX)
  const sy = Math.round(seedY)

  for (const radius of CORRECTION_RADII) {
    const closed = radius === 0 ? barriers : dilate(barriers, size, radius)
    const seed = nearestFreeInSameRegion(barriers, closed, size, sx, sy, radius * 3)
    if (!seed) continue

    const result = floodFill(closed, size, seed[0], seed[1])
    if (result.leaked || result.filledPixels === 0) continue
    if (radius === 0) return result

    const grown = dilate(result.region, size, radius)
    for (let i = 0; i < grown.length; i++) if (barriers[i]) grown[i] = 0
    return { region: grown, leaked: false, filledPixels: countSet(grown) }
  }

  return { region: new Uint8Array(size.width * size.height), leaked: true, filledPixels: 0 }
}
