import type { ColorFamily, Item } from './types.ts'

/* Colour maths used by the decision tree. Pure functions, no DOM. */

export interface Hsl {
  /** Hue in degrees, 0–360. */
  h: number
  /** Saturation, 0–1. */
  s: number
  /** Lightness, 0–1. */
  l: number
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value)
}

export function hexToHsl(hex: string): Hsl {
  if (!isHexColor(hex)) return { h: 0, s: 0, l: 0.5 }
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, l }

  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / delta) % 6
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4
  return { h: (h * 60 + 360) % 360, s, l }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const part = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

/** Names a colour the way people do when they talk about clothes. */
export function colorFamily(hex: string): ColorFamily {
  const { h, s, l } = hexToHsl(hex)

  if (l < 0.13) return 'black'
  if (l > 0.9 && s < 0.5) return 'white'
  if (s < 0.12) return 'grey'

  const warm = h < 50 || h >= 345
  if (warm && s < 0.45 && l > 0.6) return 'beige'
  if (h >= 10 && h < 50 && l < 0.42) return 'brown'
  if (h >= 200 && h < 260 && l < 0.3) return 'navy'

  if (h < 15 || h >= 345) return 'red'
  if (h < 45) return 'orange'
  if (h < 70) return 'yellow'
  if (h < 170) return 'green'
  if (h < 260) return 'blue'
  if (h < 295) return 'purple'
  return 'pink'
}

const NEUTRAL_FAMILIES: ReadonlySet<ColorFamily> = new Set([
  'black',
  'white',
  'grey',
  'beige',
  'brown',
  'navy',
])

/**
 * Neutrals go with everything, so they are ignored when checking whether
 * colours work together. Denim counts as a neutral whatever its shade.
 */
export function isNeutral(item: Pick<Item, 'color' | 'kind'>): boolean {
  return item.kind === 'jeans' || NEUTRAL_FAMILIES.has(colorFamily(item.color))
}

/** The shortest distance between two hues on the colour wheel, 0–180. */
export function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

export type ColorRelation = 'related' | 'opposite' | 'clashing'

export const RELATED_MAX_DEGREES = 45
export const OPPOSITE_MIN_DEGREES = 135

/** Neighbours on the wheel look calm, opposites look bold, the rest fight. */
export function colorRelation(hexA: string, hexB: string): ColorRelation {
  const distance = hueDistance(hexToHsl(hexA).h, hexToHsl(hexB).h)
  if (distance <= RELATED_MAX_DEGREES) return 'related'
  if (distance >= OPPOSITE_MIN_DEGREES) return 'opposite'
  return 'clashing'
}

export function lightness(hex: string): number {
  return hexToHsl(hex).l
}

/** True for colours dark enough to need a light outline when drawn. */
export function isDark(hex: string): boolean {
  return lightness(hex) < 0.3
}
