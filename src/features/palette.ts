import type { ColorFamily } from '../engine/types.ts'

/** One typical shade per colour family, used wherever the user picks a colour. */
export const PALETTE: { family: ColorFamily; hex: string }[] = [
  { family: 'black', hex: '#141414' },
  { family: 'white', hex: '#f7f5f0' },
  { family: 'grey', hex: '#8a8a8a' },
  { family: 'beige', hex: '#d2bf9d' },
  { family: 'brown', hex: '#6b4428' },
  { family: 'navy', hex: '#1f2a44' },
  { family: 'blue', hex: '#3f6fb5' },
  { family: 'green', hex: '#2f6b4f' },
  { family: 'yellow', hex: '#e6c229' },
  { family: 'orange', hex: '#d9722b' },
  { family: 'red', hex: '#c0392b' },
  { family: 'pink', hex: '#e58fb0' },
  { family: 'purple', hex: '#6f4a9c' },
]
