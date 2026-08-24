/**
 * Builds the image-generation prompt from Claude's reading of the drawing.
 *
 * Pure and dependency-free so it can be unit-tested without network or
 * Cloudflare types (see tests/prompt.test.ts in the app package).
 */

export interface CreatureAnalysis {
  creatureName: string
  description: string
  keyFeatures: string[]
}

/** Visual flavour each power should add to the finished illustration. */
const POWER_LOOKS: Record<string, string> = {
  water: 'droplets and cool blue highlights',
  fire: 'warm ember glow and small flames',
  strong: 'a sturdy, powerful build with rocky texture',
  wind: 'swirling breeze lines and a sense of motion',
  animal: 'soft fur or feather texture',
  electricity: 'crackling sparks and bright yellow arcs',
  venom: 'glowing violet-green markings',
}

/**
 * Deliberately generic style wording — it produces the intended look
 * without naming any trademarked franchise style.
 */
const STYLE =
  "Friendly cartoon creature illustration for a children's game: bold clean outlines, " +
  'smooth cel shading, bright saturated colours, full body visible and centred, ' +
  'plain flat pale background, no text, no watermark, no border.'

export function buildImagePrompt(analysis: CreatureAnalysis, powers: string[]): string {
  const features = analysis.keyFeatures.filter(Boolean)
  const powerLooks = powers.map((p) => POWER_LOOKS[p]).filter(Boolean)

  const lines = [
    `Draw a single original creature called "${analysis.creatureName}".`,
    analysis.description,
    features.length > 0 ? `Keep these exactly: ${features.join('; ')}.` : '',
    powerLooks.length > 0 ? `Show its elemental powers as ${powerLooks.join(', ')}.` : '',
    'The attached reference image is the original drawing this is based on — keep its ' +
      'composition, proportions, colours and every part the artist included. Render the ' +
      'same creature cleanly and cohesively; do not replace it with a different creature.',
    STYLE,
  ]

  return lines.filter(Boolean).join('\n\n')
}
