import { LIBRARY_OBJECTS } from '../data/objects'
import type { LibraryObject } from '../types'

interface ShapesTrayProps {
  onPickUp: (obj: LibraryObject, e: React.PointerEvent) => void
  onBrowse: () => void
}

/** Shapes-mode toolbar: a quick tray of draggable objects + Browse-all.
 * Objects only — never animals (those come from the Sketch tool). */
export function ShapesTray({ onPickUp, onBrowse }: ShapesTrayProps) {
  const quickPicks = LIBRARY_OBJECTS.slice(0, 6)
  return (
    <div className="shapes-tray" data-testid="shapes-tray">
      <span className="toolbar-hint">Drag an object onto your creature — objects only, no animals.</span>
      <div className="tray-row">
        {quickPicks.map((obj) => (
          <button
            key={obj.id}
            className="tray-item"
            onPointerDown={(e) => onPickUp(obj, e)}
            data-testid={`tray-${obj.id}`}
          >
            <span className="tray-emoji">{obj.emoji}</span>
            <span className="tray-name">{obj.name}</span>
          </button>
        ))}
        <button className="tray-item browse" onClick={onBrowse} data-testid="browse-library">
          <span className="tray-emoji">🔍</span>
          <span className="tray-name">Browse all</span>
        </button>
      </div>
    </div>
  )
}
