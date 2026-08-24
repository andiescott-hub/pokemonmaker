import type { CreatureDraft } from '../types'
import { POWERS } from '../data/powers'
import { CANVAS_W, CANVAS_H, renderDraft } from '../utils/render'
import { ACCESS_CODE, GENERATOR_URL, hasRealGenerator } from '../config'

export interface GenerationResult {
  image: string
  /** Claude's reading of what the child drew — shown back to them. */
  description: string
  creatureName: string
}

/**
 * The Finish step.
 *
 * With a generation worker configured (VITE_GENERATOR_URL), the child's
 * drawing is sent to it: Claude works out what creature they meant to draw,
 * and Gemini renders a finished illustration from that reading, using the
 * drawing itself as a reference. See worker/README.md.
 *
 * With no worker configured it falls back to `offlinePreview` below, so the
 * app still works in dev, in tests, and offline.
 */
export async function generateCreature(draft: CreatureDraft): Promise<GenerationResult> {
  if (!hasRealGenerator()) return offlinePreview(draft)

  const source = renderDraft(draft).toDataURL('image/png')

  const response = await fetch(GENERATOR_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image: source, powers: draft.powers, accessCode: ACCESS_CODE }),
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(body?.error ?? `Generator failed (${response.status})`)
  }

  // The worker returns a null image when Claude read the drawing but the
  // image step failed (billing, quota, an outage). Rather than dead-end a
  // child, show their own artwork alongside the name Claude gave it.
  if (!body?.image) {
    if (body?.imageError) console.error('image generation failed:', body.imageError)
    return {
      image: renderDraft(draft).toDataURL('image/png'),
      description: body?.description ?? '',
      creatureName: body?.creatureName ?? '',
    }
  }

  return {
    image: body.image,
    description: body.description ?? '',
    creatureName: body.creatureName ?? '',
  }
}

/**
 * Offline stand-in: composites the child's own layers with a power-tinted
 * glow. Not AI — it just makes the flow usable without keys or network.
 */
async function offlinePreview(draft: CreatureDraft): Promise<GenerationResult> {
  await new Promise((resolve) => setTimeout(resolve, 1200))

  const source = renderDraft(draft)
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')!

  const tint = POWER_TINTS[draft.powers[0] ?? 'water']
  const glow = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 60, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W / 2)
  glow.addColorStop(0, tint)
  glow.addColorStop(1, '#ffffff')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  ctx.drawImage(source, 0, 0)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '40px serif'
  draft.powers.forEach((id, i) => {
    const power = POWERS.find((p) => p.id === id)
    if (power) ctx.fillText(power.emoji, CANVAS_W / 2 + (i - 1) * 70, CANVAS_H - 44)
  })

  return {
    image: canvas.toDataURL('image/png'),
    creatureName: 'Your creature',
    description: 'Offline preview — connect the generator to bring it fully to life.',
  }
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
