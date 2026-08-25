import type { LibraryObject, ObjectCategoryId } from '../types'

export const OBJECT_CATEGORIES: { id: ObjectCategoryId; label: string }[] = [
  { id: 'parts', label: 'Creature parts' },
  { id: 'elements', label: 'Powers & elements' },
  { id: 'gear', label: 'Gear & accessories' },
  { id: 'nature', label: 'Nature' },
  { id: 'shapes', label: 'Shapes & misc' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'everyday', label: 'Everyday objects' },
]

/**
 * Hand-drawn shapes, in a 0-100 box, for the parts that matter most to a
 * creature maker. These exist because no emoji represents a horn, tail,
 * fin, claw or spike — the nearest options are whole animals, and the
 * library never contains one of those.
 */
const PATHS = {
  wings: 'M50 52 C34 22 12 18 4 30 C-2 42 8 62 28 68 C36 70 44 64 50 52 Z M50 52 C66 22 88 18 96 30 C102 42 92 62 72 68 C64 70 56 64 50 52 Z',
  horns: 'M30 88 C22 62 20 34 34 10 C38 22 40 44 44 66 C46 76 42 84 34 88 Z M70 88 C78 62 80 34 66 10 C62 22 60 44 56 66 C54 76 58 84 66 88 Z',
  spikes: 'M6 88 L22 26 L38 88 Z M34 88 L50 12 L66 88 Z M62 88 L78 26 L94 88 Z',
  tail: 'M12 86 C12 60 26 34 54 22 C74 14 88 20 94 32 C86 26 74 24 62 30 C40 42 30 62 28 86 Z',
  fin: 'M14 90 C22 52 44 20 82 8 C74 34 70 60 74 90 Z',
  claw: 'M22 12 C40 30 52 54 54 88 C44 78 36 62 30 44 Z M48 10 C64 30 74 54 76 88 C68 76 60 60 54 40 Z',
} as const

/**
 * The object library. Hard rule from the handoff: **no whole animals**,
 * ever — creatures come from the Sketch tool. Body parts are allowed, so a
 * child can add wings to the creature they drew themselves.
 *
 * `keywords` drive the description search, which is how voice search finds
 * things ("something to fly with" -> wings, feather, balloon).
 */
export const LIBRARY_OBJECTS: LibraryObject[] = [
  // ── Creature parts ────────────────────────────────────────────────
  { id: 'wings', name: 'Wings', category: 'parts', emoji: '🪽', path: PATHS.wings, keywords: ['fly', 'flying', 'flight', 'feathered', 'soar', 'glide', 'air'] },
  { id: 'horns', name: 'Horns', category: 'parts', emoji: '🔱', path: PATHS.horns, keywords: ['spiky', 'sharp', 'pointy', 'head', 'antlers', 'devil', 'tough', 'scary'] },
  { id: 'spikes', name: 'Spikes', category: 'parts', emoji: '🔺', path: PATHS.spikes, keywords: ['spiky', 'sharp', 'pointy', 'back', 'dinosaur', 'ridge', 'scary', 'tough'] },
  { id: 'tail', name: 'Tail', category: 'parts', emoji: '🌀', path: PATHS.tail, keywords: ['back', 'behind', 'swish', 'curly', 'long'] },
  { id: 'fin', name: 'Fin', category: 'parts', emoji: '🔷', path: PATHS.fin, keywords: ['swim', 'swimming', 'water', 'sea', 'ocean', 'shark'] },
  { id: 'claw', name: 'Claws', category: 'parts', emoji: '🗡️', path: PATHS.claw, keywords: ['sharp', 'scary', 'grab', 'scratch', 'hands', 'feet', 'tough'] },
  { id: 'shell', name: 'Shell', category: 'parts', emoji: '🐚', keywords: ['hard', 'armour', 'armor', 'protect', 'back', 'tough', 'spiral'] },
  { id: 'feather', name: 'Feather', category: 'parts', emoji: '🪶', keywords: ['fly', 'flying', 'soft', 'light', 'wing', 'fluffy'] },
  { id: 'tooth', name: 'Tooth', category: 'parts', emoji: '🦷', keywords: ['sharp', 'bite', 'scary', 'mouth', 'fang', 'tough'] },
  { id: 'eye', name: 'Big eye', category: 'parts', emoji: '👁️', keywords: ['see', 'look', 'watch', 'face', 'stare'] },
  { id: 'bone', name: 'Bone', category: 'parts', emoji: '🦴', keywords: ['skeleton', 'scary', 'hard', 'white', 'spooky'] },
  { id: 'egg', name: 'Egg', category: 'parts', emoji: '🥚', keywords: ['baby', 'hatch', 'round', 'smooth', 'new'] },

  // ── Powers & elements ─────────────────────────────────────────────
  { id: 'flame', name: 'Flame', category: 'elements', emoji: '🔥', keywords: ['fire', 'hot', 'burn', 'blaze', 'red', 'power'] },
  { id: 'droplet', name: 'Water drop', category: 'elements', emoji: '💧', keywords: ['water', 'wet', 'rain', 'splash', 'blue', 'power'] },
  { id: 'bolt', name: 'Lightning', category: 'elements', emoji: '⚡', keywords: ['electric', 'electricity', 'zap', 'spark', 'shock', 'storm', 'power'] },
  { id: 'snowflake', name: 'Snowflake', category: 'elements', emoji: '❄️', keywords: ['ice', 'cold', 'freeze', 'frost', 'winter', 'power'] },
  { id: 'icecube', name: 'Ice', category: 'elements', emoji: '🧊', keywords: ['cold', 'freeze', 'frozen', 'block', 'clear'] },
  { id: 'bubble', name: 'Bubble', category: 'elements', emoji: '🫧', keywords: ['water', 'float', 'round', 'clear', 'soap', 'air'] },
  { id: 'sparkles', name: 'Sparkles', category: 'elements', emoji: '✨', keywords: ['magic', 'shiny', 'glitter', 'shine', 'twinkle', 'special'] },
  { id: 'comet', name: 'Comet', category: 'elements', emoji: '☄️', keywords: ['space', 'fast', 'fire', 'sky', 'falling', 'star'] },
  { id: 'volcano', name: 'Volcano', category: 'elements', emoji: '🌋', keywords: ['fire', 'lava', 'hot', 'erupt', 'mountain', 'power'] },
  { id: 'tornado', name: 'Whirlwind', category: 'elements', emoji: '🌪️', keywords: ['wind', 'air', 'spin', 'storm', 'twist', 'power'] },

  // ── Gear & accessories ────────────────────────────────────────────
  { id: 'crown', name: 'Crown', category: 'gear', emoji: '👑', keywords: ['king', 'queen', 'royal', 'gold', 'head', 'wear', 'fancy'] },
  { id: 'helmet', name: 'Helmet', category: 'gear', emoji: '🪖', keywords: ['head', 'wear', 'protect', 'armour', 'armor', 'safe', 'tough'] },
  { id: 'goggles', name: 'Goggles', category: 'gear', emoji: '🥽', keywords: ['eyes', 'wear', 'face', 'see', 'swim', 'fly'] },
  { id: 'scarf', name: 'Scarf', category: 'gear', emoji: '🧣', keywords: ['neck', 'wear', 'warm', 'cosy', 'cozy', 'soft'] },
  { id: 'bowtie', name: 'Bow', category: 'gear', emoji: '🎀', keywords: ['wear', 'pretty', 'fancy', 'ribbon', 'cute'] },
  { id: 'sword', name: 'Sword', category: 'gear', emoji: '⚔️', keywords: ['sharp', 'fight', 'battle', 'weapon', 'metal', 'tough', 'scary'] },
  { id: 'shield', name: 'Shield', category: 'gear', emoji: '🛡️', keywords: ['protect', 'block', 'armour', 'armor', 'defend', 'tough', 'safe'] },
  { id: 'bell', name: 'Bell', category: 'gear', emoji: '🔔', keywords: ['ring', 'sound', 'noisy', 'gold', 'neck', 'jingle'] },
  { id: 'key', name: 'Key', category: 'gear', emoji: '🔑', keywords: ['unlock', 'open', 'metal', 'secret', 'gold'] },
  { id: 'backpack', name: 'Backpack', category: 'gear', emoji: '🎒', keywords: ['carry', 'bag', 'back', 'wear', 'store'] },
  { id: 'hat', name: 'Top hat', category: 'gear', emoji: '🎩', keywords: ['wear', 'head', 'cap', 'fancy', 'smart', 'posh'] },

  // ── Nature ────────────────────────────────────────────────────────
  { id: 'crystal', name: 'Crystal', category: 'nature', emoji: '🔮', keywords: ['magic', 'shiny', 'glow', 'gem', 'clear', 'special'] },
  { id: 'gem', name: 'Gem', category: 'nature', emoji: '💎', keywords: ['shiny', 'jewel', 'treasure', 'sparkle', 'precious', 'blue'] },
  { id: 'mushroom', name: 'Mushroom', category: 'nature', emoji: '🍄', keywords: ['fungus', 'forest', 'red', 'spotty', 'grow', 'poison'] },
  { id: 'flower', name: 'Flower', category: 'nature', emoji: '🌸', keywords: ['petal', 'pretty', 'pink', 'grow', 'plant', 'bloom'] },
  { id: 'vine', name: 'Vine', category: 'nature', emoji: '🌿', keywords: ['plant', 'green', 'leaves', 'grow', 'climb', 'twist'] },
  { id: 'coral', name: 'Coral', category: 'nature', emoji: '🪸', keywords: ['sea', 'ocean', 'underwater', 'branchy', 'pink', 'reef'] },
  { id: 'rock', name: 'Rock', category: 'nature', emoji: '🪨', keywords: ['stone', 'hard', 'heavy', 'boulder', 'grey', 'tough'] },
  { id: 'tree', name: 'Tree', category: 'nature', emoji: '🌳', keywords: ['plant', 'tall', 'leaves', 'branch', 'climb', 'wood'] },
  { id: 'cloud', name: 'Cloud', category: 'nature', emoji: '☁️', keywords: ['sky', 'fluffy', 'soft', 'float', 'fly', 'white'] },
  { id: 'leaf', name: 'Leaf', category: 'nature', emoji: '🍃', keywords: ['plant', 'green', 'small', 'light'] },

  // ── Shapes & misc ─────────────────────────────────────────────────
  { id: 'orb', name: 'Orb', category: 'shapes', emoji: '🔵', keywords: ['ball', 'round', 'sphere', 'circle', 'blue'] },
  { id: 'ring', name: 'Ring', category: 'shapes', emoji: '⭕', keywords: ['circle', 'round', 'hoop', 'loop', 'halo'] },
  { id: 'triangle', name: 'Triangle', category: 'shapes', emoji: '🔺', keywords: ['shape', 'pointy', 'spike', 'sharp'] },
  { id: 'star', name: 'Star', category: 'shapes', emoji: '⭐', keywords: ['shape', 'shine', 'sparkle', 'pointy', 'gold', 'space'] },
  { id: 'spiral', name: 'Spiral', category: 'shapes', emoji: '🌀', keywords: ['swirl', 'twist', 'curl', 'round', 'hypnotic'] },
  { id: 'web', name: 'Web', category: 'shapes', emoji: '🕸️', keywords: ['sticky', 'net', 'trap', 'spooky', 'threads'] },
  { id: 'gear', name: 'Gear', category: 'shapes', emoji: '⚙️', keywords: ['cog', 'machine', 'metal', 'spin', 'robot'] },
  { id: 'magnet', name: 'Magnet', category: 'shapes', emoji: '🧲', keywords: ['pull', 'stick', 'metal', 'attract', 'red'] },
  { id: 'balloon', name: 'Balloon', category: 'shapes', emoji: '🎈', keywords: ['float', 'fly', 'party', 'round', 'light', 'air'] },
  { id: 'battery', name: 'Battery', category: 'shapes', emoji: '🔋', keywords: ['power', 'energy', 'charge', 'electric', 'robot'] },

  // ── Furniture ─────────────────────────────────────────────────────
  { id: 'sofa', name: 'Sofa', category: 'furniture', emoji: '🛋️', keywords: ['couch', 'sit', 'seat', 'soft', 'cushy', 'lounge'] },
  { id: 'chair', name: 'Chair', category: 'furniture', emoji: '🪑', keywords: ['sit', 'seat'] },
  { id: 'table', name: 'Table', category: 'furniture', emoji: '🟫', keywords: ['desk', 'flat', 'surface', 'eat'] },
  { id: 'lamp', name: 'Lamp', category: 'furniture', emoji: '💡', keywords: ['light', 'glow', 'bright', 'shine'] },
  { id: 'beanbag', name: 'Bean bag', category: 'furniture', emoji: '🫘', keywords: ['sit', 'seat', 'soft', 'squishy', 'comfy'] },
  { id: 'cushion', name: 'Cushion', category: 'furniture', emoji: '🛏️', keywords: ['pillow', 'sit', 'soft', 'squishy', 'comfy'] },

  // ── Everyday objects ──────────────────────────────────────────────
  { id: 'box', name: 'Box', category: 'everyday', emoji: '📦', keywords: ['container', 'cube', 'carry', 'store', 'square'] },
  { id: 'umbrella', name: 'Umbrella', category: 'everyday', emoji: '☂️', keywords: ['rain', 'shade', 'cover', 'wet'] },
  { id: 'bag', name: 'Bag', category: 'everyday', emoji: '👜', keywords: ['carry', 'store', 'handle'] },
  { id: 'candle', name: 'Candle', category: 'everyday', emoji: '🕯️', keywords: ['fire', 'light', 'flame', 'glow', 'wax'] },
  { id: 'drum', name: 'Drum', category: 'everyday', emoji: '🥁', keywords: ['music', 'noise', 'bang', 'sound', 'loud'] },
  { id: 'clock', name: 'Clock', category: 'everyday', emoji: '⏰', keywords: ['time', 'tick', 'round', 'alarm', 'noisy'] },
]

export const objectById = (id: string): LibraryObject | undefined =>
  LIBRARY_OBJECTS.find((o) => o.id === id)

/** The six shown on the Shapes tray without opening the full library —
 * chosen for creature-building rather than taken off the top of the list. */
export const QUICK_PICK_IDS = ['wings', 'horns', 'spikes', 'tail', 'flame', 'crown']

export const QUICK_PICKS: LibraryObject[] = QUICK_PICK_IDS.map(
  (id) => objectById(id) as LibraryObject,
)

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
