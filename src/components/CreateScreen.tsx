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

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

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
  const startNewCreature = useAppStore((s) => s.startNewCreature)
  const [paintColor, setPaintColor] = useState(PAINT_COLORS[0])
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [eraser, setEraser] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Wiping the whole canvas takes two taps — one stray tap shouldn't
  // destroy a drawing a kid just spent ten minutes on.
  const clearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      window.setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    setConfirmClear(false)
    setEraser(false)
    startNewCreature()
  }

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
    // While dragging, block native touch scrolling too — iOS Safari would
    // otherwise pan the page instead of moving the ghost (CSS touch-action
    // alone is not reliable there).
    const blockTouch = (e: TouchEvent) => e.preventDefault()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    document.addEventListener('touchmove', blockTouch, { passive: false })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('touchmove', blockTouch)
    }
  }, [drag?.obj, placeObject]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Place a library pick near the middle, stepping each new one around a
   * small spiral. Dropping every object on the exact centre meant adding
   * wings, then horns, then a flame left only the flame visible.
   * (Dragging from the tray uses the drop point and is unaffected.)
   */
  const addFromLibrary = (obj: LibraryObject) => {
    const n = useAppStore.getState().draft.objects.length
    const angle = n * 2.4 // radians — a loose spiral, not a ring
    const radius = n === 0 ? 0 : 60 + n * 14
    placeObject(obj.id, {
      x: clamp(CANVAS_W / 2 + Math.cos(angle) * radius, 60, CANVAS_W - 60),
      y: clamp(CANVAS_H / 2 + Math.sin(angle) * radius, 60, CANVAS_H - 60),
    })
    setLibraryOpen(false)
  }

  return (
    <div className="create-screen">
      {mode === 'finish' ? (
        <FinishScreen />
      ) : (
        <div className="canvas-wrap">
          <CreatureCanvas svgRef={svgRef} paintColor={paintColor} eraser={eraser} />
          <div className="canvas-tools">
            <button
              className={`canvas-tool${eraser ? ' active' : ''}`}
              onClick={() => setEraser((on) => !on)}
              aria-pressed={eraser}
              title="Rubber — tap or swipe to remove lines, colour and objects"
              data-testid="eraser-button"
            >
              <span className="tool-icon">🧽</span>
              <span className="tool-label">Rubber</span>
            </button>
            <button
              className={`canvas-tool${confirmClear ? ' confirming' : ''}`}
              onClick={clearAll}
              title="Start this creature over"
              data-testid="clear-button"
            >
              <span className="tool-icon">🗑️</span>
              <span className="tool-label">{confirmClear ? 'Sure?' : 'Start over'}</span>
            </button>
          </div>
          {mode === 'sketch' && !eraser && (
            <span className="canvas-hint">Draw your creature — or tap the rubber to remove something.</span>
          )}
          {eraser && (
            <span className="canvas-hint erasing" data-testid="eraser-hint">
              Rubber on — tap or swipe over anything to remove it.
            </span>
          )}
        </div>
      )}

      {/* No toolbar in Finish mode — reserving its height squeezed the
          result and pushed the actions under the dock. */}
      {mode !== 'finish' && (
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
      )}

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
