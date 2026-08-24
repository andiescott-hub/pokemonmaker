import type { Power } from '../types'

/** The power set from the design handoff — keep this exact list unless the
 * founders say otherwise. Open question: whether these 7 are final. */
export const POWERS: Power[] = [
  { id: 'water', label: 'Water', emoji: '💧' },
  { id: 'fire', label: 'Fire', emoji: '🔥' },
  { id: 'strong', label: 'Strong', emoji: '💪' },
  { id: 'wind', label: 'Wind', emoji: '🌬️' },
  { id: 'animal', label: 'Animal', emoji: '🐾' },
  { id: 'electricity', label: 'Electricity', emoji: '⚡' },
  { id: 'venom', label: 'Venom', emoji: '🧪' },
]
