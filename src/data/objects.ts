import type { LibraryObject, ObjectCategoryId } from '../types'

export const OBJECT_CATEGORIES: { id: ObjectCategoryId; label: string }[] = [
  { id: 'furniture', label: 'Furniture' },
  { id: 'everyday', label: 'Everyday objects' },
  { id: 'nature', label: 'Nature' },
  { id: 'shapes', label: 'Shapes & misc' },
]

/**
 * Starter object library from the handoff — a representative set, meant to
 * grow. Hard rule: NO ANIMALS ever appear here; animals/creatures only come
 * from the Sketch tool. `keywords` make description searches work
 * ("something to sit on, kind of soft" → sofa, bean bag, cushion).
 */
export const LIBRARY_OBJECTS: LibraryObject[] = [
  // Furniture
  { id: 'sofa', name: 'Sofa', category: 'furniture', emoji: '🛋️', keywords: ['couch', 'sit', 'seat', 'soft', 'cushy', 'lounge'] },
  { id: 'chair', name: 'Chair', category: 'furniture', emoji: '🪑', keywords: ['sit', 'seat'] },
  { id: 'table', name: 'Table', category: 'furniture', emoji: '🟫', keywords: ['desk', 'flat', 'surface', 'eat'] },
  { id: 'lamp', name: 'Lamp', category: 'furniture', emoji: '💡', keywords: ['light', 'glow', 'bright', 'shine'] },
  { id: 'beanbag', name: 'Bean bag', category: 'furniture', emoji: '🫘', keywords: ['sit', 'seat', 'soft', 'squishy', 'comfy'] },
  { id: 'cushion', name: 'Cushion', category: 'furniture', emoji: '🛏️', keywords: ['pillow', 'sit', 'soft', 'squishy', 'comfy'] },
  // Everyday objects
  { id: 'hat', name: 'Hat', category: 'everyday', emoji: '🎩', keywords: ['wear', 'head', 'cap'] },
  { id: 'box', name: 'Box', category: 'everyday', emoji: '📦', keywords: ['container', 'cube', 'carry', 'store'] },
  { id: 'umbrella', name: 'Umbrella', category: 'everyday', emoji: '☂️', keywords: ['rain', 'shade', 'cover'] },
  { id: 'bag', name: 'Bag', category: 'everyday', emoji: '🎒', keywords: ['carry', 'backpack', 'store'] },
  // Nature
  { id: 'rock', name: 'Rock', category: 'nature', emoji: '🪨', keywords: ['stone', 'hard', 'heavy', 'boulder'] },
  { id: 'tree', name: 'Tree', category: 'nature', emoji: '🌳', keywords: ['plant', 'tall', 'leaves', 'branch', 'climb'] },
  { id: 'cloud', name: 'Cloud', category: 'nature', emoji: '☁️', keywords: ['sky', 'fluffy', 'soft', 'float', 'fly'] },
  { id: 'leaf', name: 'Leaf', category: 'nature', emoji: '🍃', keywords: ['plant', 'green', 'small'] },
  // Shapes & misc
  { id: 'triangle', name: 'Triangle', category: 'shapes', emoji: '🔺', keywords: ['shape', 'pointy', 'spike'] },
  { id: 'star', name: 'Star', category: 'shapes', emoji: '⭐', keywords: ['shape', 'shine', 'sparkle', 'pointy'] },
  { id: 'gear', name: 'Gear', category: 'shapes', emoji: '⚙️', keywords: ['cog', 'machine', 'metal', 'spin'] },
  { id: 'balloon', name: 'Balloon', category: 'shapes', emoji: '🎈', keywords: ['float', 'fly', 'party', 'round', 'light'] },
]

export const objectById = (id: string): LibraryObject | undefined =>
  LIBRARY_OBJECTS.find((o) => o.id === id)

/**
 * Search matching by name AND description keywords, so spoken queries like
 * "something to sit on, kind of soft" match sofa/bean bag/cushion. This is
 * deliberately simple word-overlap matching — the integration point for a
 * real semantic/embedding search later. Results are ranked by how many
 * query words hit.
 */
export function searchObjects(query: string, objects: LibraryObject[] = LIBRARY_OBJECTS): LibraryObject[] {
  const words = query
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3)
  if (words.length === 0) return []
  const scored = objects
    .map((obj) => {
      const haystack = [obj.name.toLowerCase(), ...obj.keywords]
      let score = 0
      for (const word of words) {
        if (haystack.some((h) => h.includes(word) || word.includes(h))) score++
      }
      return { obj, score }
    })
    .filter(({ score }) => score > 0)
  scored.sort((a, b) => b.score - a.score)
  return scored.map(({ obj }) => obj)
}
