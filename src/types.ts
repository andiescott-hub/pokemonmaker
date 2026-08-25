/** A single point on the canvas, in canvas coordinates. */
export interface Point {
  x: number
  y: number
}

/** One freehand pencil stroke. Strokes are never destroyed — the
 * hold-to-undo gesture toggles `removed`, so holding again can restore. */
export interface Stroke {
  id: string
  points: Point[]
  removed: boolean
}

/** A flood-fill applied in Paint mode, keyed to the tap point and color.
 * The fill is re-rasterized against the current strokes when rendering. */
export interface Fill {
  id: string
  seed: Point
  color: string
}

export type PowerId =
  | 'water'
  | 'fire'
  | 'strong'
  | 'wind'
  | 'animal'
  | 'electricity'
  | 'venom'

export interface Power {
  id: PowerId
  label: string
  emoji: string
}

/** Exactly this many powers must be selected before a creature can be finished. */
export const REQUIRED_POWERS = 3

export type ObjectCategoryId =
  | 'parts'
  | 'elements'
  | 'gear'
  | 'nature'
  | 'furniture'
  | 'everyday'
  | 'shapes'

/** An object in the Shapes library. `keywords` power description-based
 * search ("something to sit on" → sofa). Never contains animals. */
export interface LibraryObject {
  id: string
  name: string
  category: ObjectCategoryId
  emoji: string
  keywords: string[]
  /**
   * Optional SVG path in a 0-100 box, drawn instead of the emoji. Needed
   * because no emoji exists for a horn, tail, fin, claw or spike — the
   * nearest candidates are whole animals, which the library never contains.
   */
  path?: string
}

/** An object the user has dragged onto the creature. */
export interface PlacedObject {
  id: string
  objectId: string
  position: Point
  scale: number
  /** Set by voice commands, e.g. "make the couch's legs disappear". */
  merged: boolean
}

export type GenerationStatus = 'idle' | 'analysing' | 'generating' | 'generated' | 'error'

/** The in-progress creature being built on the Create canvas. */
export interface CreatureDraft {
  strokes: Stroke[]
  fills: Fill[]
  powers: PowerId[]
  objects: PlacedObject[]
  generationStatus: GenerationStatus
  /** Data URL of the generated image, once the Finish step has run. */
  generatedImage: string | null
  /** Claude's reading of what the child drew, shown back to them. */
  description: string
  creatureName: string
  regenerateCount: number
}

/** A finished creature living in the Home gallery. */
export interface SubmittedCreature {
  id: string
  image: string
  powers: PowerId[]
  submittedAt: number
  description: string
  creatureName: string
}

export type CreateMode = 'sketch' | 'paint' | 'powers' | 'shapes' | 'finish'
export type Tab = 'create' | 'home'

export const emptyDraft = (): CreatureDraft => ({
  strokes: [],
  fills: [],
  powers: [],
  objects: [],
  generationStatus: 'idle',
  generatedImage: null,
  description: '',
  creatureName: '',
  regenerateCount: 0,
})
