/** Paint-mode toolbar: color swatch row (expandable set per the handoff). */
export const PAINT_COLORS = [
  '#e8a33d', // amber (the wireframe's example creature color)
  '#4f8fd1', // blue
  '#5aa860', // green
  '#8e3b4a', // berry
  '#e8543f', // coral
  '#8b6bb8', // violet
  '#e7c94f', // yellow
  '#7a5636', // brown
]

export function PaintTools({ color, onPick }: { color: string; onPick: (c: string) => void }) {
  return (
    <div className="paint-tools" data-testid="paint-tools">
      <span className="toolbar-hint">Tap inside your sketch to fill — paint outside the lines? It snaps back on its own.</span>
      <div className="swatch-row">
        {PAINT_COLORS.map((c) => (
          <button
            key={c}
            className={`swatch${c === color ? ' active' : ''}`}
            style={{ background: c }}
            onClick={() => onPick(c)}
            aria-label={`Paint color ${c}`}
            data-testid={`swatch-${c.slice(1)}`}
          />
        ))}
      </div>
    </div>
  )
}
