import { useAppStore } from '../store'
import { POWERS } from '../data/powers'
import { REQUIRED_POWERS } from '../types'

/**
 * Powers-mode toolbar: the 7 power chips. Exactly REQUIRED_POWERS must be
 * chosen — once full, unselected chips are disabled until one is
 * deselected. Power is split evenly across the chosen three (no weighting).
 */
export function PowersPanel() {
  const powers = useAppStore((s) => s.draft.powers)
  const togglePower = useAppStore((s) => s.togglePower)
  const full = powers.length >= REQUIRED_POWERS

  return (
    <div className="powers-panel" data-testid="powers-panel">
      <span className="toolbar-hint">
        Pick exactly {REQUIRED_POWERS} — power is split evenly.{' '}
        {full ? 'All slots full! Tap a chosen power to swap it out.' : `${REQUIRED_POWERS - powers.length} to go.`}
      </span>
      <div className="power-chips">
        {POWERS.map((power) => {
          const selected = powers.includes(power.id)
          return (
            <button
              key={power.id}
              className={`power-chip${selected ? ' selected' : ''}`}
              disabled={!selected && full}
              onClick={() => togglePower(power.id)}
              aria-pressed={selected}
              data-testid={`power-${power.id}`}
            >
              <span>{power.emoji}</span> {power.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
