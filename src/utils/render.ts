import type { CreatureDraft, Fill, Point, Stroke } from '../types'
import { correctedFill } from './floodFill'
import { objectById } from '../data/objects'

/** Logical canvas size — all strokes/positions are stored in these coords. */
export const CANVAS_W = 1000
export const CANVAS_H = 600

export const STROKE_WIDTH = 4

/** On-canvas size of a placed library object, before its own scale. */
export const OBJECT_SIZE = 64

/** How far a placed object can be resized. The floor keeps a shape big
 * enough to still be tappable; the ceiling keeps one object from covering
 * the whole creature. */
export const MIN_SCALE = 0.4
export const MAX_SCALE = 4

/** One clamp shared by the resize handle, the +/- buttons and the tests,
 * so no two paths can disagree about the limits. */
export const clampScale = (scale: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))

export const strokePath = (stroke: Stroke): string =>
  stroke.points.length === 1
    ? `M ${stroke.points[0].x} ${stroke.points[0].y} l 0.01 0`
    : 'M ' + stroke.points.map((p) => `${p.x} ${p.y}`).join(' L ')

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], scale = 1) {
  ctx.lineWidth = STROKE_WIDTH * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#1f1d1a'
  for (const stroke of strokes) {
    if (stroke.removed || stroke.points.length === 0) continue
    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x * scale, stroke.points[0].y * scale)
    for (const p of stroke.points.slice(1)) ctx.lineTo(p.x * scale, p.y * scale)
    ctx.stroke()
  }
}

/** Fill computation runs at reduced resolution — plenty for lofi fills and
 * keeps the BFS fast on iPad. */
const FILL_SCALE = 0.35

/** Fill-resolution raster size. */
const fillSize = () => ({
  width: Math.round(CANVAS_W * FILL_SCALE),
  height: Math.round(CANVAS_H * FILL_SCALE),
})

/** Rasterize visible strokes into a barrier mask at fill resolution. */
function strokeBarriers(ctx: CanvasRenderingContext2D, strokes: Stroke[], w: number, h: number): Uint8Array {
  drawStrokes(ctx, strokes, FILL_SCALE)
  const raster = ctx.getImageData(0, 0, w, h)
  const barriers = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    if (raster.data[i * 4 + 3] > 40) barriers[i] = 1
  }
  ctx.clearRect(0, 0, w, h)
  return barriers
}

/**
 * Which fill is painting the region under `point`, if any — used by the
 * eraser. Runs one flood fill from the tapped point and returns the
 * topmost fill whose seed lands in the same enclosed region.
 */
export function fillIdAtPoint(strokes: Stroke[], fills: Fill[], point: Point): string | null {
  if (fills.length === 0) return null
  const { width: w, height: h } = fillSize()
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const barriers = strokeBarriers(ctx, strokes, w, h)
  const { region } = correctedFill(barriers, { width: w, height: h }, point.x * FILL_SCALE, point.y * FILL_SCALE)
  for (let i = fills.length - 1; i >= 0; i--) {
    const sx = Math.round(fills[i].seed.x * FILL_SCALE)
    const sy = Math.round(fills[i].seed.y * FILL_SCALE)
    if (sx >= 0 && sy >= 0 && sx < w && sy < h && region[sy * w + sx]) return fills[i].id
  }
  return null
}

/**
 * Compute the paint layer: rasterize visible strokes as barriers, then run
 * the spill-corrected flood fill for each stored fill seed.
 */
export function renderFillLayer(strokes: Stroke[], fills: Fill[]): HTMLCanvasElement {
  const { width: w, height: h } = fillSize()
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  if (fills.length === 0) return canvas

  const barriers = strokeBarriers(ctx, strokes, w, h)
  const out = ctx.createImageData(w, h)
  for (const fill of fills) {
    const { region } = correctedFill(barriers, { width: w, height: h }, fill.seed.x * FILL_SCALE, fill.seed.y * FILL_SCALE)
    const [r, g, b] = hexToRgb(fill.color)
    for (let i = 0; i < region.length; i++) {
      if (!region[i]) continue
      out.data[i * 4] = r
      out.data[i * 4 + 1] = g
      out.data[i * 4 + 2] = b
      out.data[i * 4 + 3] = 255
    }
  }
  ctx.putImageData(out, 0, 0)
  return canvas
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Composite the full draft (fills under strokes under objects) to a canvas. */
export function renderDraft(draft: CreatureDraft): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  const fillLayer = renderFillLayer(draft.strokes, draft.fills)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(fillLayer, 0, 0, CANVAS_W, CANVAS_H)

  drawStrokes(ctx, draft.strokes)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const placed of draft.objects) {
    const obj = objectById(placed.objectId)
    if (!obj) continue
    const size = OBJECT_SIZE * placed.scale
    ctx.save()
    if (placed.merged) ctx.globalAlpha = 0.85
    if (obj.path) {
      // Same 0-100 path the canvas and pickers draw, so what the child sees
      // is exactly what Claude is sent.
      ctx.translate(placed.position.x - size / 2, placed.position.y - size / 2)
      ctx.scale(size / 100, size / 100)
      ctx.fillStyle = '#1f1d1a'
      ctx.fill(new Path2D(obj.path))
    } else {
      ctx.font = `${size}px serif`
      ctx.fillText(obj.emoji, placed.position.x, placed.position.y)
    }
    ctx.restore()
  }
  return canvas
}
