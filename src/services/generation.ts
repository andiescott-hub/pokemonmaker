import type { CreatureDraft } from '../types'
import { POWERS } from '../data/powers'
import { CANVAS_W, CANVAS_H, renderDraft } from '../utils/render'

/**
 * The Finish step's generative AI call.
 *
 * ── STUB ─────────────────────────────────────────────────────────────────
 * The real implementation should send the composited draft image (below)
 * plus a prompt built from the selected powers and placed objects to an
 * image-generation model, and return the finished illustration. Swap the
 * body of `generateCreature` for that call — the UI only depends on this
 * signature and drives idle/generating/generated/error states around it.
 *
 * The stub composites the user's actual layers (fills, strokes, objects)
 * into one image, stamps a soft power-tinted background and an
 * "AI generated" badge, and resolves after a short delay so the loading
 * state is visible.
 */
export async function generateCreature(draft: CreatureDraft): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1800))

  const source = renderDraft(draft)
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')!

  // Soft radial glow tinted by the first selected power.
  const tint = POWER_TINTS[draft.powers[0] ?? 'water']
  const glow = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 60, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W / 2)
  glow.addColorStop(0, tint)
  glow.addColorStop(1, '#ffffff')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  ctx.drawImage(source, 0, 0)

  // Power emblems along the bottom — even split, per the handoff.
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '40px serif'
  draft.powers.forEach((id, i) => {
    const power = POWERS.find((p) => p.id === id)
    if (!power) return
    ctx.fillText(power.emoji, CANVAS_W / 2 + (i - 1) * 70, CANVAS_H - 44)
  })

  return canvas.toDataURL('image/png')
}

const POWER_TINTS: Record<string, string> = {
  water: '#dbeeff',
  fire: '#ffe4d6',
  strong: '#f0e6d8',
  wind: '#e4f4ef',
  animal: '#f3ecdd',
  electricity: '#fdf6d8',
  venom: '#eee4f5',
}
