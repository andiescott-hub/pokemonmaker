import { useAppStore } from '../store'
import { generateCreature } from '../services/generation'
import { hasRealGenerator } from '../config'
import { REQUIRED_POWERS } from '../types'

/**
 * Finish mode: the generative AI step. AI blends sketch, paint, shapes and
 * powers into one finished creature; Regenerate re-rolls it, Submit sends
 * it into a Poké Ball in the Home gallery (and locks it — a fresh draft
 * starts).
 */
export function FinishScreen() {
  const draft = useAppStore((s) => s.draft)
  const { setGeneration, bumpRegenerate, submitCreature, setTab, setMode } = useAppStore.getState()

  const hasSketch = draft.strokes.some((s) => !s.removed)
  const powersReady = draft.powers.length === REQUIRED_POWERS
  const ready = hasSketch && powersReady

  const generate = async (isRegenerate: boolean) => {
    if (isRegenerate) bumpRegenerate()
    // Two visible phases: Claude reads the drawing, then Gemini paints it.
    setGeneration(hasRealGenerator() ? 'analysing' : 'generating')
    try {
      const result = await generateCreature(useAppStore.getState().draft)
      setGeneration('generated', result)
    } catch (error) {
      console.error('generation failed:', error)
      setGeneration('error')
    }
  }

  const submit = () => {
    submitCreature()
    setMode('sketch')
    setTab('home')
  }

  return (
    <div className="finish-screen" data-testid="finish-screen">
      {!ready && (
        <div className="finish-gate">
          <p>Before your creature comes to life it needs:</p>
          <ul>
            <li className={hasSketch ? 'done' : ''}>{hasSketch ? '✓' : '○'} a sketch</li>
            <li className={powersReady ? 'done' : ''}>
              {powersReady ? '✓' : '○'} exactly {REQUIRED_POWERS} powers ({draft.powers.length}/{REQUIRED_POWERS})
            </li>
          </ul>
        </div>
      )}

      {ready && draft.generationStatus === 'idle' && (
        <div className="finish-gate">
          <p>Ready! AI will blend your sketch, paint, shapes &amp; powers into one finished creature.</p>
          <button className="primary-button" onClick={() => generate(false)} data-testid="generate-button">
            ✨ Bring it to life
          </button>
        </div>
      )}

      {(draft.generationStatus === 'analysing' || draft.generationStatus === 'generating') && (
        <div className="finish-gate" data-testid="generating">
          <div className="spinner" aria-hidden />
          <p>
            {draft.generationStatus === 'analysing'
              ? 'Looking closely at your drawing…'
              : 'Painting your creature…'}
          </p>
        </div>
      )}

      {draft.generationStatus === 'error' && (
        <div className="finish-gate">
          <p>Something went wrong bringing it to life.</p>
          <button className="primary-button" onClick={() => generate(true)}>
            Try again
          </button>
        </div>
      )}

      {draft.generationStatus === 'generated' && draft.generatedImage && (
        <div className="finish-result" data-testid="finish-result">
          <div className="result-frame">
            <span className="ai-badge">AI generated</span>
            <img src={draft.generatedImage} alt="Your finished creature" />
          </div>
          {draft.creatureName && (
            <h2 className="creature-name" data-testid="creature-name">
              {draft.creatureName}
            </h2>
          )}
          <p className="finish-caption" data-testid="creature-description">
            {draft.description || 'AI blended sketch, paint, shapes & powers into one finished creature.'}
          </p>
          <div className="finish-actions">
            <button className="secondary-button" onClick={() => generate(true)} data-testid="regenerate-button">
              Regenerate
            </button>
            <button className="primary-button" onClick={submit} data-testid="submit-button">
              Submit ➜ 🔴
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
