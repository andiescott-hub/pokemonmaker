/** The classic Poké Ball glyph: red top, white bottom, black band, center button. */
export function PokeBall({ size = 64, empty = false }: { size?: number; empty?: boolean }) {
  if (empty) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="45" fill="none" stroke="#c9c3b8" strokeWidth="4" strokeDasharray="10 8" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="#ffffff" stroke="#1f1d1a" strokeWidth="6" />
      <path d="M 4.5 50 A 45.5 45.5 0 0 1 95.5 50 L 4.5 50 Z" fill="#e8543f" />
      <rect x="4" y="46" width="92" height="8" fill="#1f1d1a" />
      <circle cx="50" cy="50" r="14" fill="#ffffff" stroke="#1f1d1a" strokeWidth="6" />
      <circle cx="50" cy="50" r="5" fill="#f0ede6" stroke="#1f1d1a" strokeWidth="2" />
    </svg>
  )
}
