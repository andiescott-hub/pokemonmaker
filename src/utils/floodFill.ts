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

/** Gap-closing radii tried in order until the fill no longer leaks. */
const CORRECTION_RADII = [2, 4, 8]

/**
 * Spill-corrected fill: flood fill with progressively stronger gap-closing;
 * a fill that still escapes to the canvas border paints nothing.
 */
export function correctedFill(
  barriers: Uint8Array,
  size: MaskSize,
  seedX: number,
  seedY: number,
): FloodResult {
  let last: FloodResult = { region: new Uint8Array(size.width * size.height), leaked: false, filledPixels: 0 }
  for (const radius of CORRECTION_RADII) {
    const closed = dilate(barriers, size, radius)
    last = floodFill(closed, size, seedX, seedY)
    if (!last.leaked) return last
  }
  return { region: new Uint8Array(size.width * size.height), leaked: true, filledPixels: 0 }
}
