import { useState } from 'react'
import { MAX_CREATURES, useAppStore } from '../store'
import { POWERS } from '../data/powers'
import { PokeBall } from './PokeBall'
import type { SubmittedCreature } from '../types'

/**
 * Home tab: every submitted creature lands here as a Poké Ball, under a
 * counter of how much of the fifty-creature collection is filled. Tapping
 * a ball opens a detail view, where it can also be deleted (the handoff
 * left this screen undesigned).
 */
export function HomeGallery() {
  const submitted = useAppStore((s) => s.submitted)
  const deleteCreature = useAppStore((s) => s.deleteCreature)
  const [open, setOpen] = useState<SubmittedCreature | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const closeDetail = () => {
    setOpen(null)
    setConfirmDelete(false)
  }

  // Deleting takes two taps, like "Start over" on the canvas — losing a
  // creature to one stray tap would be miserable.
  const remove = (creature: SubmittedCreature) => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      window.setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    deleteCreature(creature.id)
    closeDetail()
  }

  return (
    <div className="home-gallery" data-testid="home-gallery">
      <p className="gallery-caption" data-testid="gallery-count">
        {submitted.length === 0
          ? `Your creatures land here as Poké Balls — room for ${MAX_CREATURES}.`
          : `${submitted.length} of ${MAX_CREATURES} collected`}
      </p>
      <div className="ball-grid">
        {submitted.map((creature) => {
          // Older creatures (and any whose analysis came back empty) have no
          // name — show something neutral rather than an empty gap.
          const name = creature.creatureName || 'Creature'
          return (
            <button
              key={creature.id}
              className="ball-slot"
              onClick={() => setOpen(creature)}
              aria-label={`Open ${name}`}
              data-testid="pokeball"
            >
              <PokeBall size={88} />
              <span className="ball-name" data-testid="pokeball-name">
                {name}
              </span>
            </button>
          )
        })}
      </div>

      {open && (
        <div className="detail-overlay" onClick={closeDetail} data-testid="creature-detail">
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
            <div className="detail-actions">
              <button
                className={`delete-button${confirmDelete ? ' confirming' : ''}`}
                onClick={() => remove(open)}
                data-testid="delete-creature"
              >
                {confirmDelete ? 'Really delete?' : '🗑️ Delete'}
              </button>
              <button className="secondary-button" onClick={closeDetail}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
