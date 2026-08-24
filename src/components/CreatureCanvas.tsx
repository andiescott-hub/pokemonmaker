import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useAppStore } from '../store'
import { CANVAS_W, CANVAS_H, STROKE_WIDTH, fillIdAtPoint, renderFillLayer, strokePath } from '../utils/render'
import { objectById } from '../data/objects'
import { REQUIRED_POWERS, type Point, type Stroke } from '../types'

/** Convert a pointer event position into canvas (viewBox) coordinates. */
export function toCanvasPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const point = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  return { x: point.x, y: point.y }
}

const HOLD_MS = 500
const HOLD_MOVE_TOLERANCE = 10
const STROKE_HIT_DISTANCE = 20

function distToStroke(p: Point, stroke: Stroke): number {
  let best = Infinity
  const pts = stroke.points
  if (pts.length === 1) return Math.hypot(p.x - pts[0].x, p.y - pts[0].y)
  for (let i = 0; i < pts.length - 1; i++) {
    best = Math.min(best, distToSegment(p, pts[i], pts[i + 1]))
  }
  return best
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

interface CreatureCanvasProps {
  svgRef: RefObject<SVGSVGElement | null>
  /** Active paint color (paint mode only). */
  paintColor: string
  /** Eraser tool active — taps and drags remove things instead of adding. */
  eraser: boolean
}

/** Half-size of an object's tap target, in canvas units. */
const OBJECT_HIT_RADIUS = 40

/**
 * The single persistent canvas shared by all Create modes.
 *
 * Gestures (per the handoff):
 * - Sketch: drag draws a stroke. Hold a stroke ~0.5s to remove it; hold
 *   again where it was to restore it (direct-manipulation undo/redo — no
 *   undo button).
 * - Paint: tap inside the sketch to flood fill (spill-corrected); the
 *   hold-to-undo gesture still works on strokes.
 * - Powers: shows the dashed chest hotspot with the slot count.
 * - Shapes: drag placed objects around.
 * - Eraser (any canvas mode): tap or swipe to remove objects, strokes and
 *   fills — the explicit alternative to the hold-to-undo gesture.
 */
export function CreatureCanvas({ svgRef, paintColor, eraser }: CreatureCanvasProps) {
  const mode = useAppStore((s) => s.mode)
  const draft = useAppStore((s) => s.draft)
  const { addStroke, toggleStroke, eraseStroke, addFill, removeFill, moveObject, removeObject } =
    useAppStore.getState()

  const [liveStroke, setLiveStroke] = useState<Point[] | null>(null)
  const holdTimer = useRef<number | null>(null)
  const holdHandled = useRef(false)
  const downPoint = useRef<Point | null>(null)
  const draggingObject = useRef<string | null>(null)

  // iOS Safari ignores CSS `touch-action: none` on SVG, so touch drags on
  // the canvas pan the page instead of drawing. Blocking the native touch
  // events with non-passive listeners is the reliable fix (React's
  // synthetic handlers are passive and can't preventDefault here). Pointer
  // events still drive the drawing logic.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const block = (e: TouchEvent) => e.preventDefault()
    svg.addEventListener('touchstart', block, { passive: false })
    svg.addEventListener('touchmove', block, { passive: false })
    return () => {
      svg.removeEventListener('touchstart', block)
      svg.removeEventListener('touchmove', block)
    }
  }, [svgRef])

  const fillLayerUrl = useMemo(() => {
    if (draft.fills.length === 0) return null
    return renderFillLayer(draft.strokes, draft.fills).toDataURL()
  }, [draft.strokes, draft.fills])

  const clearHold = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current)
    holdTimer.current = null
  }

  const strokeAt = (p: Point): Stroke | undefined =>
    [...draft.strokes].reverse().find((s) => !s.removed && distToStroke(p, s) < STROKE_HIT_DISTANCE)

  const objectAt = (p: Point) =>
    [...draft.objects]
      .reverse()
      .find((o) => Math.hypot(p.x - o.position.x, p.y - o.position.y) < OBJECT_HIT_RADIUS * o.scale)

  /**
   * Erase whatever is under the point, topmost first: objects sit above
   * strokes, which sit above fills. `includeFills` is off while dragging —
   * finding the tapped fill costs a flood fill, so it runs on tap only.
   */
  const eraseAt = (p: Point, includeFills: boolean): boolean => {
    const obj = objectAt(p)
    if (obj) {
      removeObject(obj.id)
      return true
    }
    const stroke = strokeAt(p)
    if (stroke) {
      eraseStroke(stroke.id)
      return true
    }
    if (includeFills) {
      const fillId = fillIdAtPoint(draft.strokes, draft.fills, p)
      if (fillId) {
        removeFill(fillId)
        return true
      }
    }
    return false
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg || draggingObject.current) return
    svg.setPointerCapture(e.pointerId)
    const p = toCanvasPoint(svg, e.clientX, e.clientY)
    downPoint.current = p
    holdHandled.current = false

    if (eraser) {
      // Erasing replaces drawing/filling entirely while the tool is on.
      eraseAt(p, true)
      return
    }

    if (mode === 'sketch' || mode === 'paint') {
      // Arm the hold-to-undo/redo gesture; a hold beats drawing/filling.
      clearHold()
      holdTimer.current = window.setTimeout(() => {
        const target = strokeAt(p)
        if (target) {
          toggleStroke(target.id)
          holdHandled.current = true
          setLiveStroke(null)
        }
      }, HOLD_MS)
    }
    if (mode === 'sketch') setLiveStroke([p])
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg || !downPoint.current) return
    const p = toCanvasPoint(svg, e.clientX, e.clientY)

    if (eraser) {
      // Swipe the rubber across strokes and objects to wipe them out.
      eraseAt(p, false)
      return
    }
    if (draggingObject.current) {
      moveObject(draggingObject.current, p)
      return
    }
    const moved = Math.hypot(p.x - downPoint.current.x, p.y - downPoint.current.y)
    if (moved > HOLD_MOVE_TOLERANCE) clearHold()
    if (mode === 'sketch' && liveStroke && !holdHandled.current) {
      setLiveStroke((prev) => (prev ? [...prev, p] : prev))
    }
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    clearHold()
    if (draggingObject.current) {
      draggingObject.current = null
      downPoint.current = null
      return
    }
    if (!svg || !downPoint.current) return
    const p = toCanvasPoint(svg, e.clientX, e.clientY)

    if (!holdHandled.current && !eraser) {
      if (mode === 'sketch' && liveStroke) {
        addStroke(liveStroke.length > 1 ? [...liveStroke, p] : liveStroke)
      } else if (mode === 'paint') {
        addFill(p, paintColor)
      }
    }
    setLiveStroke(null)
    downPoint.current = null
  }

  // Chest hotspot sits at the centroid of the visible sketch.
  const hotspot = useMemo(() => {
    const visible = draft.strokes.filter((s) => !s.removed)
    if (visible.length === 0) return { x: CANVAS_W / 2, y: CANVAS_H / 2 }
    let sx = 0
    let sy = 0
    let n = 0
    for (const s of visible)
      for (const p of s.points) {
        sx += p.x
        sy += p.y
        n++
      }
    return { x: sx / n, y: sy / n }
  }, [draft.strokes])

  return (
    <svg
      ref={svgRef}
      className={`creature-canvas mode-${mode}${eraser ? ' erasing' : ''}`}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        clearHold()
        setLiveStroke(null)
        draggingObject.current = null
        downPoint.current = null
      }}
      data-testid="creature-canvas"
    >
      {fillLayerUrl && <image href={fillLayerUrl} x="0" y="0" width={CANVAS_W} height={CANVAS_H} />}

      {draft.strokes.map(
        (stroke) =>
          !stroke.removed && (
            <path
              key={stroke.id}
              d={strokePath(stroke)}
              className="stroke"
              strokeWidth={STROKE_WIDTH}
              data-testid="stroke"
            />
          ),
      )}
      {liveStroke && <path d={strokePath({ id: 'live', points: liveStroke, removed: false })} className="stroke live" strokeWidth={STROKE_WIDTH} />}

      {draft.objects.map((placed) => {
        const obj = objectById(placed.objectId)
        if (!obj) return null
        return (
          <text
            key={placed.id}
            x={placed.position.x}
            y={placed.position.y}
            fontSize={64 * placed.scale}
            textAnchor="middle"
            dominantBaseline="central"
            className={`placed-object${placed.merged ? ' merged' : ''}`}
            onPointerDown={(e) => {
              if (eraser) {
                e.stopPropagation()
                removeObject(placed.id)
                return
              }
              if (mode !== 'shapes') return
              e.stopPropagation()
              svgRef.current?.setPointerCapture(e.pointerId)
              draggingObject.current = placed.id
              downPoint.current = placed.position
            }}
            data-testid={`placed-${obj.id}`}
          >
            {obj.emoji}
          </text>
        )
      })}

      {mode === 'powers' && (
        <g className="power-hotspot" transform={`translate(${hotspot.x} ${hotspot.y})`}>
          <circle r="52" className="hotspot-ring" />
          <text y="-4" textAnchor="middle" className="hotspot-count" data-testid="hotspot-count">
            {draft.powers.length}/{REQUIRED_POWERS}
          </text>
          <text y="18" textAnchor="middle" className="hotspot-caption">
            slots
          </text>
        </g>
      )}
    </svg>
  )
}
