import { describe, expect, it } from 'vitest'
import { LIBRARY_OBJECTS, OBJECT_CATEGORIES, QUICK_PICKS, searchObjects } from '../src/data/objects'

describe('object library', () => {
  it('contains no whole animals — those only ever come from the Sketch tool', () => {
    // Body parts (wings, horns, a tail) are allowed and deliberate; a whole
    // creature is not, because that is what the child is drawing.
    const animals = [
      'dog', 'cat', 'bird', 'fish', 'animal', 'pet', 'creature', 'monster',
      'dragon', 'horse', 'bear', 'lion', 'snake', 'frog', 'mouse', 'rabbit',
      'shark', 'bug', 'spider', 'dinosaur', 'unicorn',
    ]
    for (const obj of LIBRARY_OBJECTS) {
      const name = obj.name.toLowerCase()
      for (const word of animals) {
        expect(name, `"${obj.name}" looks like a whole animal`).not.toContain(word)
      }
    }
  })

  it('every object is renderable — an emoji, or a vector path for the parts emoji lacks', () => {
    for (const obj of LIBRARY_OBJECTS) {
      expect(obj.emoji.length, `${obj.name} has no emoji`).toBeGreaterThan(0)
      if (obj.path) expect(obj.path.startsWith('M'), `${obj.name} path is malformed`).toBe(true)
    }
  })

  it('has no duplicate ids, and every object sits in a real category', () => {
    const ids = LIBRARY_OBJECTS.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
    const categories = new Set(OBJECT_CATEGORIES.map((c) => c.id))
    for (const obj of LIBRARY_OBJECTS) expect(categories.has(obj.category)).toBe(true)
  })

  it('every category has objects in it, so none renders empty', () => {
    for (const cat of OBJECT_CATEGORIES) {
      const count = LIBRARY_OBJECTS.filter((o) => o.category === cat.id).length
      expect(count, `category "${cat.label}" is empty`).toBeGreaterThan(0)
    }
  })

  it('the quick-pick tray resolves to real objects', () => {
    expect(QUICK_PICKS).toHaveLength(6)
    for (const obj of QUICK_PICKS) expect(obj?.id).toBeTruthy()
  })

  it('offers creature-building parts, not just household objects', () => {
    const parts = LIBRARY_OBJECTS.filter((o) => o.category === 'parts').map((o) => o.id)
    expect(parts).toEqual(expect.arrayContaining(['wings', 'horns', 'spikes', 'tail']))
  })

  it('matches by exact name', () => {
    const results = searchObjects('sofa')
    expect(results[0]?.id).toBe('sofa')
  })

  it('matches by description, not just name', () => {
    const results = searchObjects('something to sit on, kind of soft')
    const ids = results.map((r) => r.id)
    expect(ids).toContain('sofa')
    expect(ids).toContain('beanbag')
    expect(ids).toContain('cushion')
    // Soft + sit ranks the soft seats above a plain chair.
    expect(ids.indexOf('sofa')).toBeLessThan(ids.indexOf('chair'))
  })

  it('matches spoken synonyms like "couch"', () => {
    expect(searchObjects('couch')[0]?.id).toBe('sofa')
  })

  it('returns nothing for an empty query', () => {
    expect(searchObjects('')).toEqual([])
  })

  it('finds creature parts from how a child would describe them', () => {
    expect(searchObjects('something to fly with').map((o) => o.id)).toContain('wings')
    expect(searchObjects('make it spiky').map((o) => o.id)).toContain('spikes')
    expect(searchObjects('something scary').map((o) => o.id)).toEqual(
      expect.arrayContaining(['claw']),
    )
    expect(searchObjects('for swimming').map((o) => o.id)).toContain('fin')
  })

  it('finds elemental power shapes', () => {
    expect(searchObjects('fire').map((o) => o.id)).toContain('flame')
    expect(searchObjects('electric zap').map((o) => o.id)).toContain('bolt')
    expect(searchObjects('something cold and icy').map((o) => o.id)).toEqual(
      expect.arrayContaining(['snowflake']),
    )
  })
})
