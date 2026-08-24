import { describe, expect, it } from 'vitest'
import { buildImagePrompt, type CreatureAnalysis } from '../worker/src/prompt'

const analysis: CreatureAnalysis = {
  creatureName: 'Couchback Tortoise',
  description: 'A round tortoise-like creature with a comfy couch fused to its shell.',
  keyFeatures: ['orange rounded body', 'four stubby legs', 'blue couch on its back'],
}

describe('buildImagePrompt', () => {
  it("carries the creature's name, description and features into the prompt", () => {
    const prompt = buildImagePrompt(analysis, [])
    expect(prompt).toContain('Couchback Tortoise')
    expect(prompt).toContain('comfy couch fused to its shell')
    expect(prompt).toContain('blue couch on its back')
  })

  it('translates powers into visual instructions', () => {
    const prompt = buildImagePrompt(analysis, ['fire', 'electricity'])
    expect(prompt).toContain('ember glow')
    expect(prompt).toContain('crackling sparks')
  })

  it('ignores unknown power ids rather than emitting blanks', () => {
    const prompt = buildImagePrompt(analysis, ['not-a-power'])
    expect(prompt).not.toContain('undefined')
    expect(prompt).not.toContain('elemental powers as .')
  })

  it('instructs the model to keep the original drawing rather than replace it', () => {
    const prompt = buildImagePrompt(analysis, [])
    expect(prompt).toMatch(/do not replace it with a different creature/i)
    expect(prompt).toMatch(/reference image/i)
  })

  it('avoids naming a trademarked franchise style', () => {
    const prompt = buildImagePrompt(analysis, ['water']).toLowerCase()
    expect(prompt).not.toContain('pokemon')
    expect(prompt).not.toContain('pokémon')
  })

  it('copes with an analysis that has no features', () => {
    const prompt = buildImagePrompt({ ...analysis, keyFeatures: [] }, [])
    expect(prompt).toContain('Couchback Tortoise')
    expect(prompt).not.toContain('Keep these exactly')
  })
})
