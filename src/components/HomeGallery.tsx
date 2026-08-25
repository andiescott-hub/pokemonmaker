import { useState } from 'react'
import { useAppStore } from '../store'
import { POWERS } from '../data/powers'
import { PokeBall } from './PokeBall'
import type { SubmittedCreature } from '../types'

const MIN_SLOTS = 8

/**
 * Home tab: every submitted creature lands here as a Poké Ball, plus
 * dashed placeholder slots for creatures still to come. Tapping a ball
 * opens a simple detail view (the handoff left this screen undesigned).
 */
export function HomeGallery() {
  const submitted = useAppStore((s) => s.submitted)
  const [open, setOpen] = useState<SubmittedCreature | null>(null)
  const emptySlots = Math.max(MIN_SLOTS - submitted.length, 2)

  return (
    <div className="home-gallery" data-testid="home-gallery">
      <div className="ball-grid">
        {submitted.map((creature) => (
          <button
            key={creature.id}
            className="ball-slot"
            onClick={() => setOpen(creature)}
            aria-label="Open creature"
            data-testid="pokeball"
          >
            <PokeBall size={88} />
          </button>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={i} className="ball-slot empty">
            <PokeBall size={88} empty />
          </div>
        ))}
      </div>
      <p className="gallery-caption">Every submitted creature lands here as a Poké Ball.</p>

      {open && (
        <div className="detail-overlay" onClick={() => setOpen(null)} data-testid="creature-detail">
          <div className="detail-card" onClick={(e) => e.stopPropagation()}>
            <img src={open.image} alt={open.creatureName || 'Submitted creature'} />
            <div className="detail-meta">
              {open.creatureName && <h2 className="creature-name">{open.creatureName}</h2>}
              {open.description && <p className="detail-description">{open.description}</p>}
              {!open.aiGenerated && <p className="finish-note">Your own drawing</p>}
              <div className="detail-powers">
                {open.powers.map((id) => {
                  const power = POWERS.find((p) => p.id === id)
                  return power ? (
                    <span key={id} className="power-chip selected small">
                      {power.emoji} {power.label}
                    </span>
                  ) : null
                })}
              </div>
              <span className="detail-date">Caught {new Date(open.submittedAt).toLocaleDateString()}</span>
            </div>
            <button className="secondary-button" onClick={() => setOpen(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
