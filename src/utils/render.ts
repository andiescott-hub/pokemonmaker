import type { CreatureDraft, Fill, Stroke } from '../types'
import { correctedFill } from './floodFill'
import { objectById } from '../data/objects'

/** Logical canvas size — all strokes/positions are stored in these coords. */
export const CANVAS_W = 1000
export const CANVAS_H = 600

export const STROKE_WIDTH = 4

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

/**
 * Compute the paint layer: rasterize visible strokes as barriers, then run
 * the spill-corrected flood fill for each stored fill seed.
 */
export function renderFillLayer(strokes: Stroke[], fills: Fill[]): HTMLCanvasElement {
  const w = Math.round(CANVAS_W * FILL_SCALE)
  const h = Math.round(CANVAS_H * FILL_SCALE)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  if (fills.length === 0) return canvas

  drawStrokes(ctx, strokes, FILL_SCALE)
  const raster = ctx.getImageData(0, 0, w, h)
  const barriers = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    if (raster.data[i * 4 + 3] > 40) barriers[i] = 1
  }
  ctx.clearRect(0, 0, w, h)

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
    ctx.save()
    ctx.font = `${64 * placed.scale}px serif`
    if (placed.merged) ctx.globalAlpha = 0.85
    ctx.fillText(obj.emoji, placed.position.x, placed.position.y)
    ctx.restore()
  }
  return canvas
}
