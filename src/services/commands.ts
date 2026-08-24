import type { CreatureDraft, PlacedObject } from '../types'
import { objectById } from '../data/objects'

/**
 * Natural-language canvas commands ("make the couch's legs disappear and
 * sit it on its back").
 *
 * ── STUB ─────────────────────────────────────────────────────────────────
 * This is the integration point for a real language model. The real
 * implementation should send `transcript` plus a serialization of the
 * draft's placed objects to a model (e.g. Claude with a tool schema of
 * canvas operations) and apply the operations it returns. The stub below
 * keyword-matches a couple of demo intents so the wireframed flow — speak,
 * see transcript, see "Done ✓", see the canvas change — works end to end.
 */

export interface CommandResult {
  /** Patches to apply to placed objects, keyed by placed-object id. */
  patches: { placedId: string; patch: Partial<PlacedObject> }[]
  /** Short confirmation shown next to the Done ✓ tick. */
  summary: string
}

export function interpretCommand(transcript: string, draft: CreatureDraft): CommandResult | null {
  const text = transcript.toLowerCase()
  const target = findMentionedObject(text, draft) ?? draft.objects[draft.objects.length - 1]
  if (!target) return null
  const name = objectById(target.objectId)?.name ?? 'object'

  if (/(disappear|remove|merge|join|sit|attach|blend)/.test(text)) {
    return {
      patches: [{ placedId: target.id, patch: { merged: true } }],
      summary: `Merged the ${name.toLowerCase()} into your creature`,
    }
  }
  if (/(bigger|larger|grow)/.test(text)) {
    return {
      patches: [{ placedId: target.id, patch: { scale: target.scale * 1.4 } }],
      summary: `Made the ${name.toLowerCase()} bigger`,
    }
  }
  if (/(smaller|shrink|tiny)/.test(text)) {
    return {
      patches: [{ placedId: target.id, patch: { scale: target.scale / 1.4 } }],
      summary: `Made the ${name.toLowerCase()} smaller`,
    }
  }
  return null
}

function findMentionedObject(text: string, draft: CreatureDraft): PlacedObject | undefined {
  return draft.objects.find((placed) => {
    const obj = objectById(placed.objectId)
    if (!obj) return false
    const names = [obj.name.toLowerCase(), ...obj.keywords]
    return names.some((n) => text.includes(n))
  })
}
