import type { LibraryObject } from '../types'

/**
 * Draws a library object — either its emoji, or its vector path when it has
 * one. Shared by the tray, the library grid and the canvas so a shape can
 * never render one way in the picker and another way on the creature.
 *
 * Paths are authored in a 0-100 box, so callers only supply a size.
 */
export function ObjectShape({ obj, size }: { obj: LibraryObject; size: number }) {
  if (!obj.path) {
    return (
      <span className="object-emoji" style={{ fontSize: size }} aria-hidden>
        {obj.emoji}
      </span>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="object-vector">
      <path d={obj.path} />
    </svg>
  )
}
