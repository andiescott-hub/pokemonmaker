import { describe, expect, it } from 'vitest'
import { LIBRARY_OBJECTS, searchObjects } from '../src/data/objects'

describe('object library', () => {
  it('contains no animals — animals only ever come from the Sketch tool', () => {
    const animalWords = ['dog', 'cat', 'bird', 'fish', 'animal', 'pet', 'creature']
    for (const obj of LIBRARY_OBJECTS) {
      for (const word of animalWords) {
        expect(obj.name.toLowerCase()).not.toContain(word)
      }
    }
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
})
