import { useAppStore } from '../store'
import type { CreateMode } from '../types'

const MODES: { id: CreateMode; label: string; icon: string }[] = [
  { id: 'sketch', label: 'Sketch', icon: '✏️' },
  { id: 'paint', label: 'Paint', icon: '🖌️' },
  { id: 'powers', label: 'Powers', icon: '⚡' },
  { id: 'shapes', label: 'Shapes', icon: '🧩' },
  { id: 'finish', label: 'Finish', icon: '✨' },
]

/** Bottom mode dock — 5 modes, freely navigable in any order (not a wizard). */
export function ModeDock() {
  const mode = useAppStore((s) => s.mode)
  const setMode = useAppStore((s) => s.setMode)
  return (
    <nav className="mode-dock" aria-label="Create modes">
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`dock-button${mode === m.id ? ' active' : ''}`}
          onClick={() => setMode(m.id)}
          aria-pressed={mode === m.id}
          data-testid={`dock-${m.id}`}
        >
          <span className="dock-icon">{m.icon}</span>
          <span className="dock-label">{m.label}</span>
        </button>
      ))}
    </nav>
  )
}
