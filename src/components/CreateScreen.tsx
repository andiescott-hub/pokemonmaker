import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store'
import { CreatureCanvas, toCanvasPoint } from './CreatureCanvas'
import { ModeDock } from './ModeDock'
import { PaintTools, PAINT_COLORS } from './PaintTools'
import { PowersPanel } from './PowersPanel'
import { ShapesTray } from './ShapesTray'
import { ObjectLibrary } from './ObjectLibrary'
import { FinishScreen } from './FinishScreen'
import type { LibraryObject } from '../types'
import { CANVAS_W, CANVAS_H } from '../utils/render'

interface DragState {
  obj: LibraryObject
  x: number
  y: number
}

/** The Create tab: one persistent canvas, a mode-specific toolbar, and the
 * bottom mode dock. Modes can be visited in any order — not a wizard. */
export function CreateScreen() {
  const mode = useAppStore((s) => s.mode)
  const placeObject = useAppStore((s) => s.placeObject)
  const [paintColor, setPaintColor] = useState(PAINT_COLORS[0])
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [drag, setDrag] = useState<DragState | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Drag-from-tray: follow the pointer with a ghost; drop over the canvas
  // places the object there.
  useEffect(() => {
    if (!drag) return
    const onMove = (e: PointerEvent) => setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d))
    const onUp = (e: PointerEvent) => {
      const svg = svgRef.current
      if (svg) {
        const rect = svg.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          placeObject(drag.obj.id, toCanvasPoint(svg, e.clientX, e.clientY))
        }
      }
      setDrag(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [drag?.obj, placeObject]) // eslint-disable-line react-hooks/exhaustive-deps

  const addFromLibrary = (obj: LibraryObject) => {
    placeObject(obj.id, { x: CANVAS_W / 2, y: CANVAS_H / 2 })
    setLibraryOpen(false)
  }

  return (
    <div className="create-screen">
      {mode === 'finish' ? (
        <FinishScreen />
      ) : (
        <div className="canvas-wrap">
          <CreatureCanvas svgRef={svgRef} paintColor={paintColor} />
          {mode === 'sketch' && (
            <span className="canvas-hint">Draw your creature — hold a stroke to undo it, hold again to bring it back.</span>
          )}
        </div>
      )}

      <div className="toolbar-area">
        {mode === 'paint' && <PaintTools color={paintColor} onPick={setPaintColor} />}
        {mode === 'powers' && <PowersPanel />}
        {mode === 'shapes' && (
          <ShapesTray
            onPickUp={(obj, e) => setDrag({ obj, x: e.clientX, y: e.clientY })}
            onBrowse={() => setLibraryOpen(true)}
          />
        )}
      </div>

      <ModeDock />

      {libraryOpen && <ObjectLibrary onSelect={addFromLibrary} onClose={() => setLibraryOpen(false)} />}

      {drag && (
        <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {drag.obj.emoji}
        </div>
      )}
    </div>
  )
}

// Re-exported for tests that need the logical canvas size.
export { CANVAS_W, CANVAS_H }
