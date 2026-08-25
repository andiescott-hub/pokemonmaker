import { QUICK_PICKS } from '../data/objects'
import type { LibraryObject } from '../types'
import { ObjectShape } from './ObjectShape'

interface ShapesTrayProps {
  onPickUp: (obj: LibraryObject, e: React.PointerEvent) => void
  onBrowse: () => void
}

/** Shapes-mode toolbar: a quick tray of draggable objects + Browse-all.
 * Objects only — never animals (those come from the Sketch tool). */
export function ShapesTray({ onPickUp, onBrowse }: ShapesTrayProps) {
  return (
    <div className="shapes-tray" data-testid="shapes-tray">
      <span className="toolbar-hint">Drag an object onto your creature — objects only, no animals.</span>
      <div className="tray-row">
        {QUICK_PICKS.map((obj) => (
          <button
            key={obj.id}
            className="tray-item"
            onPointerDown={(e) => onPickUp(obj, e)}
            data-testid={`tray-${obj.id}`}
          >
            <ObjectShape obj={obj} size={26} />
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
