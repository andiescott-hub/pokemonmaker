import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyDraft } from '../src/types'

/**
 * The generator's degraded path: Claude read the drawing but the image step
 * failed. The child should still get their creature, named and described,
 * showing their own artwork — never an error.
 *
 * renderDraft is mocked at the module boundary: it does real canvas work,
 * which isn't available (or interesting) here. What matters is the decision
 * the service makes about the worker's response.
 */
vi.mock('../src/utils/render', () => ({
  renderDraft: () => ({ toDataURL: () => 'data:image/png;base64,OWN-DRAWING' }),
  CANVAS_W: 1000,
  CANVAS_H: 600,
}))

// src/config.ts reads import.meta.env at module load, so the env must be
// stubbed before the import — not inside the tests.
vi.stubEnv('VITE_GENERATOR_URL', 'https://worker.example/generate')
vi.stubEnv('VITE_ACCESS_CODE', 'test-code')

const { generateCreature } = await import('../src/services/generation')

const draft = () => ({
  ...emptyDraft(),
  strokes: [{ id: 's1', points: [{ x: 1, y: 1 }], removed: false }],
})

const mockWorker = (response: Record<string, unknown>, ok = true, status = 200) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, status, json: async () => response }))

afterEach(() => vi.unstubAllGlobals())

describe('generateCreature against a configured worker', () => {
  it("falls back to the child's own drawing when the image step failed", async () => {
    mockWorker({
      creatureName: 'Couchback Tortoise',
      description: 'A round tortoise with a couch fused to its shell.',
      image: null,
      imageError: 'Gemini 429: quota exceeded',
    })

    const result = await generateCreature(draft())

    // Claude's reading survives, and there is still a picture to show.
    expect(result.creatureName).toBe('Couchback Tortoise')
    expect(result.description).toContain('couch')
    expect(result.image).toBe('data:image/png;base64,OWN-DRAWING')
    // Crucially: this is the child's drawing, so the UI must not badge it
    // as AI generated. The reason is kept for diagnosis.
    expect(result.aiGenerated).toBe(false)
    expect(result.imageError).toContain('quota')
  })

  it('uses the generated image when one comes back', async () => {
    mockWorker({
      creatureName: 'Sparkfin',
      description: 'A finned creature crackling with electricity.',
      image: 'data:image/png;base64,AI-ART',
    })

    const result = await generateCreature(draft())
    expect(result.image).toBe('data:image/png;base64,AI-ART')
    expect(result.creatureName).toBe('Sparkfin')
    expect(result.aiGenerated).toBe(true)
  })

  it('throws when the worker itself errors, so the UI can offer a retry', async () => {
    mockWorker({ error: 'analysis failed: overloaded' }, false, 502)

    await expect(generateCreature(draft())).rejects.toThrow(/overloaded/)
  })
})
