import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useAppStore } from '../store'
import {
  CANVAS_W,
  CANVAS_H,
  MAX_SCALE,
  MIN_SCALE,
  OBJECT_SIZE,
  STROKE_WIDTH,
  clampScale,
  fillIdAtPoint,
  renderFillLayer,
  strokePath,
} from '../utils/render'
import { objectById } from '../data/objects'
import { REQUIRED_POWERS, type PlacedObject, type Point, type Stroke } from '../types'

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

/** Each tap of the -/+ buttons changes the size by this much. */
const SCALE_STEP = 1.25

/** Control sizes in canvas units. The canvas viewBox is 1000 wide and an
 * iPad renders it at roughly 1:1, so a 26-unit button is a ~52px target —
 * comfortably above the 44px minimum for a fingertip. */
const BUTTON_R = 26
const HANDLE_R = 17

/** Where the ring, corner handle and -/+ buttons sit for a selected object.
 * Pure geometry, in canvas units, so it can be reasoned about (and tested)
 * without a DOM. */
export function resizeGeometry(centre: Point, scale: number) {
  const size = OBJECT_SIZE * scale
  const ring = size / 2 + 14
  const clampX = (x: number) => Math.min(CANVAS_W - BUTTON_R, Math.max(BUTTON_R, x))
  // Buttons sit above the shape, unless it is near the top of the canvas —
  // then they flip below rather than hang off the edge.
  const above = centre.y - ring - BUTTON_R - 8
  const buttonY = above > BUTTON_R ? above : Math.min(CANVAS_H - BUTTON_R, centre.y + ring + BUTTON_R + 8)
  return {
    ring,
    handle: { x: centre.x + ring * Math.SQRT1_2, y: centre.y + ring * Math.SQRT1_2 },
    shrink: { x: clampX(centre.x - 38), y: buttonY },
    grow: { x: clampX(centre.x + 38), y: buttonY },
  }
}

/** A resize in progress: the object's centre plus where the drag began, so
 * the new scale is a ratio of how far the finger has moved from it. */
interface ResizeState {
  id: string
  centre: Point
  startDistance: number
  startScale: number
}

/** The ring, corner handle and -/+ buttons drawn around the selected shape.
 * Presentation only — the gestures themselves live on the canvas, which owns
 * the pointer state. */
function ResizeControls({
  placed,
  onHandleDown,
  onStep,
}: {
  placed: PlacedObject
  onHandleDown: (e: React.PointerEvent, placed: PlacedObject) => void
  onStep: (e: React.PointerEvent, placed: PlacedObject, factor: number) => void
}) {
  const { ring, handle, shrink, grow } = resizeGeometry(placed.position, placed.scale)
  const atMin = placed.scale <= MIN_SCALE + 1e-6
  const atMax = placed.scale >= MAX_SCALE - 1e-6

  return (
    <g className="resize-controls" data-testid="resize-controls">
      <circle cx={placed.position.x} cy={placed.position.y} r={ring} className="resize-ring" data-testid="resize-ring" />
      <g
        className={`resize-button${atMin ? ' spent' : ''}`}
        onPointerDown={(e) => onStep(e, placed, 1 / SCALE_STEP)}
        data-testid="shrink-object"
      >
        <circle cx={shrink.x} cy={shrink.y} r={BUTTON_R} />
        <text x={shrink.x} y={shrink.y} textAnchor="middle" dominantBaseline="central">
          −
        </text>
      </g>
      <g
        className={`resize-button${atMax ? ' spent' : ''}`}
        onPointerDown={(e) => onStep(e, placed, SCALE_STEP)}
        data-testid="grow-object"
      >
        <circle cx={grow.x} cy={grow.y} r={BUTTON_R} />
        <text x={grow.x} y={grow.y} textAnchor="middle" dominantBaseline="central">
          +
        </text>
      </g>
      {/* Last, so the handle takes the touch where it overlaps the ring. */}
      <circle
        cx={handle.x}
        cy={handle.y}
        r={HANDLE_R}
        className="resize-handle"
        onPointerDown={(e) => onHandleDown(e, placed)}
        data-testid="resize-handle"
      />
    </g>
  )
}

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
 * - Shapes: drag placed objects around; tap one to select it, then drag
 *   its corner handle (or tap the -/+ buttons) to resize it.
 * - Eraser (any canvas mode): tap or swipe to remove objects, strokes and
 *   fills — the explicit alternative to the hold-to-undo gesture.
 */
export function CreatureCanvas({ svgRef, paintColor, eraser }: CreatureCanvasProps) {
  const mode = useAppStore((s) => s.mode)
  const draft = useAppStore((s) => s.draft)
  const { addStroke, toggleStroke, eraseStroke, addFill, removeFill, moveObject, removeObject, updateObject } =
    useAppStore.getState()

  const [liveStroke, setLiveStroke] = useState<Point[] | null>(null)
  // Which placed object is showing its resize handle. Transient UI, so it
  // stays out of the persisted store.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const holdTimer = useRef<number | null>(null)
  const holdHandled = useRef(false)
  const downPoint = useRef<Point | null>(null)
  const draggingObject = useRef<string | null>(null)
  const resizing = useRef<ResizeState | null>(null)

  // Drop the selection when it can no longer be acted on: another mode, the
  // rubber, or the object itself being erased (which would otherwise leave a
  // ring around nothing).
  const selectable = mode === 'shapes' && !eraser
  useEffect(() => {
    if (!selectable) setSelectedId(null)
  }, [selectable])
  useEffect(() => {
    setSelectedId((id) => (id && draft.objects.some((o) => o.id === id) ? id : null))
  }, [draft.objects])

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
    if (!svg || draggingObject.current || resizing.current) return
    svg.setPointerCapture(e.pointerId)
    const p = toCanvasPoint(svg, e.clientX, e.clientY)
    downPoint.current = p
    holdHandled.current = false

    if (eraser) {
      // Erasing replaces drawing/filling entirely while the tool is on.
      eraseAt(p, true)
      return
    }

    if (mode === 'shapes') {
      // Hit-test from the object's centre rather than relying on its own
      // element: vector parts like wings are mostly holes, and a child
      // shouldn't have to land on solid ink to pick one up.
      const obj = objectAt(p)
      if (obj) {
        draggingObject.current = obj.id
        setSelectedId(obj.id)
      }
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

    // Dragging the handle resizes and never moves — checked first so the
    // two gestures can't both fire.
    const resize = resizing.current
    if (resize) {
      const distance = Math.hypot(p.x - resize.centre.x, p.y - resize.centre.y)
      updateObject(resize.id, { scale: clampScale((resize.startScale * distance) / resize.startDistance) })
      return
    }
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
    if (resizing.current) {
      resizing.current = null
      downPoint.current = null
      return
    }
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
      } else if (mode === 'shapes') {
        // Tapping past every shape puts the handle away. (A tap on a shape
        // never reaches here — it returns in the dragging branch above.)
        setSelectedId(null)
      }
    }
    setLiveStroke(null)
    downPoint.current = null
  }

  /** Begin a handle drag: remember where the finger started relative to the
   * shape's centre, so the move handler can turn that into a ratio. */
  const startResize = (e: React.PointerEvent, placed: PlacedObject) => {
    e.stopPropagation()
    const svg = svgRef.current
    if (!svg) return
    svg.setPointerCapture(e.pointerId)
    const p = toCanvasPoint(svg, e.clientX, e.clientY)
    resizing.current = {
      id: placed.id,
      centre: placed.position,
      // Never zero: a press dead on the centre would divide by it.
      startDistance: Math.max(1, Math.hypot(p.x - placed.position.x, p.y - placed.position.y)),
      startScale: placed.scale,
    }
    downPoint.current = placed.position
  }

  const stepScale = (e: React.PointerEvent, placed: PlacedObject, factor: number) => {
    e.stopPropagation()
    updateObject(placed.id, { scale: clampScale(placed.scale * factor) })
  }

  // The shape wearing the resize controls, if any.
  const selected = selectable ? draft.objects.find((o) => o.id === selectedId) : undefined

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
        resizing.current = null
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
        const size = OBJECT_SIZE * placed.scale
        const className = `placed-object${placed.merged ? ' merged' : ''}`
        // Vector parts (wings, horns, spikes…) draw their path; everything
        // else is an emoji glyph. Paths are authored in a 0-100 box.
        if (obj.path) {
          return (
            <g
              key={placed.id}
              className={`${className} placed-object-vector`}
              transform={`translate(${placed.position.x - size / 2} ${placed.position.y - size / 2}) scale(${size / 100})`}
              data-testid={`placed-${obj.id}`}
            >
              <path d={obj.path} />
            </g>
          )
        }
        return (
          <text
            key={placed.id}
            x={placed.position.x}
            y={placed.position.y}
            fontSize={size}
            textAnchor="middle"
            dominantBaseline="central"
            className={className}
            data-testid={`placed-${obj.id}`}
          >
            {obj.emoji}
          </text>
        )
      })}

      {selected && <ResizeControls placed={selected} onHandleDown={startResize} onStep={stepScale} />}

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
