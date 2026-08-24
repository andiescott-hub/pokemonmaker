/**
 * Thin wrapper over the Web Speech API, shared by voice search (Shapes
 * library) and the persistent "bring to life" voice command mic.
 *
 * Feature-detected: on browsers without SpeechRecognition (or when the mic
 * permission is denied) callers fall back to typed input — every voice
 * entry point in the UI also accepts text.
 */

type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = globalThis as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null
}

export const isVoiceSupported = (): boolean => getRecognitionCtor() !== null

export interface ListenHandlers {
  /** Fired with the live transcript as the user speaks (interim results). */
  onTranscript: (transcript: string, isFinal: boolean) => void
  onEnd: () => void
  onError?: () => void
}

/** Start listening; returns a stop function. Throws if unsupported. */
export function startListening({ onTranscript, onEnd, onError }: ListenHandlers): () => void {
  const Ctor = getRecognitionCtor()
  if (!Ctor) throw new Error('Speech recognition not supported')
  const recognition = new Ctor()
  recognition.lang = 'en-US'
  recognition.interimResults = true
  recognition.continuous = false
  recognition.onresult = (event) => {
    const parts: string[] = []
    for (let i = 0; i < event.results.length; i++) {
      parts.push(event.results[i][0].transcript)
    }
    onTranscript(parts.join(' ').trim(), false)
  }
  recognition.onend = () => onEnd()
  recognition.onerror = () => {
    onError?.()
    onEnd()
  }
  recognition.start()
  return () => recognition.stop()
}
