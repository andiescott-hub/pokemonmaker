import { useMemo, useState } from 'react'
import { LIBRARY_OBJECTS, OBJECT_CATEGORIES, searchObjects } from '../data/objects'
import type { LibraryObject } from '../types'
import { MicButton } from './MicButton'
import { ObjectShape } from './ObjectShape'

interface ObjectLibraryProps {
  onSelect: (obj: LibraryObject) => void
  onClose: () => void
}

/**
 * The full object library: search bar with inline mic (say "couch" or
 * "something to sit on" — filters live as you speak), objects grouped into
 * named categories. Search matches descriptions, not just names.
 */
export function ObjectLibrary({ onSelect, onClose }: ObjectLibraryProps) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => (query.trim() ? searchObjects(query) : null), [query])

  return (
    <div className="library-overlay" data-testid="object-library">
      <div className="library-panel">
        <header className="library-header">
          <h2>Object library</h2>
          <button className="close-button" onClick={onClose} aria-label="Close library" data-testid="close-library">
            ✕
          </button>
        </header>
        <div className="library-search">
          <input
            type="search"
            placeholder="Search objects… try “something to sit on”"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="library-search"
          />
          <MicButton
            size="sm"
            label="Voice search"
            onLive={(t) => setQuery(t)}
            onFinal={(t) => {
              setQuery(t)
              return `searching “${t}”`
            }}
          />
        </div>

        {results ? (
          <section className="library-section">
            <h3>Results</h3>
            {results.length === 0 && <p className="library-empty">Nothing matched — try describing it differently.</p>}
            <div className="object-grid" data-testid="search-results">
              {results.map((obj) => (
                <ObjectCard key={obj.id} obj={obj} onSelect={onSelect} />
              ))}
            </div>
            <p className="library-note">Matches by description, not just name — tap a result to add it.</p>
          </section>
        ) : (
          OBJECT_CATEGORIES.map((cat) => (
            <section key={cat.id} className="library-section">
              <h3>{cat.label}</h3>
              <div className="object-grid">
                {LIBRARY_OBJECTS.filter((o) => o.category === cat.id).map((obj) => (
                  <ObjectCard key={obj.id} obj={obj} onSelect={onSelect} />
                ))}
              </div>
            </section>
          ))
        )}
        <p className="library-note">A big, browsable library of everything — except animals. That’s what you’re drawing.</p>
      </div>
    </div>
  )
}

function ObjectCard({ obj, onSelect }: { obj: LibraryObject; onSelect: (obj: LibraryObject) => void }) {
  return (
    <button className="object-card" onClick={() => onSelect(obj)} data-testid={`object-${obj.id}`}>
      <ObjectShape obj={obj} size={32} />
      <span className="object-name">{obj.name}</span>
    </button>
  )
}
