import { useEffect, useRef, useState } from 'react'
import { isVoiceSupported, startListening } from '../services/voice'

interface MicButtonProps {
  /** Fired with the live transcript while listening (e.g. live search filter). */
  onLive?: (transcript: string) => void
  /** Fired when listening ends. Return a short summary to show a "Done ✓"
   * confirmation, or null when the utterance wasn't understood. */
  onFinal: (transcript: string) => string | null
  size?: 'sm' | 'lg'
  label?: string
}

type MicState = 'idle' | 'listening' | 'done' | 'unheard'

/**
 * The shared voice-command component from the handoff: mic button, dashed
 * live-transcript bubble, "Done ✓" once applied. On browsers without
 * speech recognition the bubble becomes a typed input — same pipeline.
 */
export function MicButton({ onLive, onFinal, size = 'lg', label = 'Voice command' }: MicButtonProps) {
  const [state, setState] = useState<MicState>('idle')
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [typed, setTyped] = useState('')
  const stopRef = useRef<(() => void) | null>(null)
  const transcriptRef = useRef('')
  const voice = isVoiceSupported()

  useEffect(() => () => stopRef.current?.(), [])

  const finish = (text: string) => {
    stopRef.current = null
    const result = text.trim() ? onFinal(text.trim()) : null
    setSummary(result ?? '')
    setState(result !== null ? 'done' : text.trim() ? 'unheard' : 'idle')
    window.setTimeout(() => setState('idle'), 2200)
  }

  const toggle = () => {
    if (state === 'listening') {
      stopRef.current?.()
      return
    }
    setTranscript('')
    setTyped('')
    setState('listening')
    if (!voice) return // typed fallback — submitted from the input below
    transcriptRef.current = ''
    stopRef.current = startListening({
      onTranscript: (t) => {
        transcriptRef.current = t
        setTranscript(t)
        onLive?.(t)
      },
      onEnd: () => finish(transcriptRef.current),
    })
  }

  return (
    <div className={`mic ${size}`}>
      <button
        className={`mic-button${state === 'listening' ? ' listening' : ''}`}
        onClick={toggle}
        aria-label={label}
        data-testid="mic-button"
      >
        🎤
      </button>
      {state === 'listening' && (
        <div className="mic-bubble" data-testid="mic-bubble">
          {voice ? (
            <span className="mic-transcript">{transcript || 'Listening…'}</span>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onLive?.(typed)
                finish(typed)
              }}
            >
              <input
                autoFocus
                className="mic-typed"
                placeholder="Type your command…"
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value)
                  onLive?.(e.target.value)
                }}
                data-testid="mic-typed-input"
              />
            </form>
          )}
        </div>
      )}
      {state === 'done' && (
        <div className="mic-bubble done" data-testid="mic-done">
          Done ✓{summary ? ` — ${summary}` : ''}
        </div>
      )}
      {state === 'unheard' && <div className="mic-bubble">Hmm, try saying that another way</div>}
    </div>
  )
}
