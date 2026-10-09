import { isDark } from '../engine/color.ts'
import type { Kind } from '../engine/types.ts'

/*
 * Flat drawings of each kind of garment, coloured with the item's colour.
 * Drawn for this project: no photos, no brands.
 *
 * Each entry is [outline, details]: the outline is filled with the item's
 * colour, the details (seams, collars, soles) are drawn as lines on top.
 */
const SHAPES: Record<Kind, [outline: string, details: string]> = {
  tshirt: [
    'M31 16 L42 12 Q50 21 58 12 L69 16 L90 33 L79 47 L70 41 L70 88 L30 88 L30 41 L21 47 L10 33 Z',
    'M42 12 Q50 25 58 12',
  ],
  shirt: [
    'M32 14 L43 10 L50 18 L57 10 L68 14 L92 72 L80 77 L70 46 L70 90 L30 90 L30 46 L20 77 L8 72 Z',
    'M50 18 V90 M43 10 L50 18 L57 10 M47 30 h.1 M47 44 h.1 M47 58 h.1 M47 72 h.1',
  ],
  sweater: [
    'M30 16 L41 12 Q50 19 59 12 L70 16 L93 70 L81 76 L71 48 L71 88 L29 88 L29 48 L19 76 L7 70 Z',
    'M41 12 Q50 24 59 12 M29 81 H71 M11 64 L22 69 M89 64 L78 69',
  ],
  trousers: ['M30 8 H70 L75 92 H56 L50 34 L44 92 H25 Z', 'M30 16 H70 M50 16 V34'],
  jeans: [
    'M30 8 H70 L75 92 H56 L50 34 L44 92 H25 Z',
    'M30 16 H70 M50 16 V34 M33 22 Q39 30 46 22 M54 22 Q61 30 67 22',
  ],
  shorts: ['M27 22 H73 L80 66 H55 L50 44 L45 66 H20 Z', 'M27 30 H73 M50 30 V44'],
  skirt: ['M36 16 H64 L82 80 Q50 90 18 80 Z', 'M36 24 H64'],
  sneakers: [
    'M8 62 Q8 48 18 44 L34 44 Q42 56 58 58 L80 62 Q92 64 92 73 V78 H8 Z',
    'M8 71 H92 M37 49 L44 46 M43 54 L50 51 M49 58 L56 55',
  ],
  boots: [
    'M34 10 H58 V44 Q64 51 76 55 Q88 59 88 70 V80 H34 Z',
    'M34 72 H88 M34 19 H58 M58 44 Q50 50 44 46',
  ],
  loafers: [
    'M8 64 Q8 54 18 52 H36 Q46 60 62 62 Q90 64 92 72 V78 H8 Z',
    'M8 72 H92 M36 52 Q40 62 54 61',
  ],
  jacket: [
    'M32 14 L43 10 L50 18 L57 10 L68 14 L92 70 L80 75 L71 46 L71 86 L29 86 L29 46 L20 75 L8 70 Z',
    'M50 18 V86 M29 79 H71 M34 60 H44 M56 60 H66',
  ],
  blazer: [
    'M33 12 L44 9 L50 20 L56 9 L67 12 L91 72 L79 77 L70 46 L72 90 L28 90 L30 46 L21 77 L9 72 Z',
    'M44 9 L40 34 L50 52 L60 34 L56 9 M50 52 V90 M53 62 h.1 M53 74 h.1 M33 66 H42',
  ],
  coat: [
    'M33 9 L44 6 L50 16 L56 6 L67 9 L90 66 L79 71 L70 42 L73 95 L27 95 L30 42 L21 71 L10 66 Z',
    'M44 6 L41 28 L50 40 L59 28 L56 6 M50 40 V95 M33 62 H42 M58 62 H67',
  ],
}

interface GarmentProps {
  kind: Kind
  /** "#rrggbb" */
  color: string
  className?: string
}

/** Decorative: the item's name is always shown or announced next to it. */
export function Garment({ kind, color, className }: GarmentProps) {
  const [outline, details] = SHAPES[kind]
  // A dark garment needs a light outline to stay visible on a dark tile, and vice versa.
  const line = isDark(color) ? 'rgb(255 255 255 / 0.5)' : 'rgb(0 0 0 / 0.45)'

  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <path d={outline} fill={color} stroke={line} strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d={details}
        fill="none"
        stroke={line}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
