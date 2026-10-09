import { describe, expect, it } from 'vitest'
import { PALETTE } from '../features/palette.ts'
import { SAMPLE_ITEMS } from '../data/sample.ts'
import {
  colorFamily,
  colorRelation,
  hexToHsl,
  hueDistance,
  isDark,
  isHexColor,
  isNeutral,
  rgbToHex,
} from './color.ts'

describe('hexToHsl', () => {
  it('converts primary colours', () => {
    expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 1, l: 0.5 })
    expect(hexToHsl('#00ff00')).toEqual({ h: 120, s: 1, l: 0.5 })
    expect(hexToHsl('#0000ff')).toEqual({ h: 240, s: 1, l: 0.5 })
  })

  it('gives greys no saturation', () => {
    expect(hexToHsl('#000000')).toEqual({ h: 0, s: 0, l: 0 })
    expect(hexToHsl('#ffffff')).toEqual({ h: 0, s: 0, l: 1 })
    expect(hexToHsl('#808080').s).toBe(0)
  })

  it('falls back to mid grey for input that is not a colour', () => {
    expect(hexToHsl('blue')).toEqual({ h: 0, s: 0, l: 0.5 })
    expect(hexToHsl('#fff')).toEqual({ h: 0, s: 0, l: 0.5 })
  })
})

describe('isHexColor and rgbToHex', () => {
  it('accepts only six-digit hex colours', () => {
    expect(isHexColor('#1a2B3c')).toBe(true)
    expect(isHexColor('#fff')).toBe(false)
    expect(isHexColor('1a2b3c')).toBe(false)
  })

  it('rounds and clamps channel values', () => {
    expect(rgbToHex(255, 128.4, 0)).toBe('#ff8000')
    expect(rgbToHex(300, -5, 15.6)).toBe('#ff0010')
  })
})

describe('colorFamily', () => {
  it.each(PALETTE)('names the palette shade $hex as $family', ({ family, hex }) => {
    expect(colorFamily(hex)).toBe(family)
  })

  it.each([
    ['#000000', 'black'],
    ['#ffffff', 'white'],
    ['#777777', 'grey'],
    ['#ff0000', 'red'],
    ['#fe0000', 'red'],
    ['#00a000', 'green'],
    ['#0050ff', 'blue'],
    ['#14224d', 'navy'],
    ['#4a2a12', 'brown'],
  ] as const)('names %s as %s', (hex, family) => {
    expect(colorFamily(hex)).toBe(family)
  })

  it('gives every sample piece a family that matches its name', () => {
    const family = (id: string) => {
      const sample = SAMPLE_ITEMS.find((item) => item.id === id)
      return sample ? colorFamily(sample.color) : undefined
    }
    expect(family('white-tee')).toBe('white')
    expect(family('black-tee')).toBe('black')
    expect(family('blue-oxford')).toBe('blue')
    expect(family('green-knit')).toBe('green')
    expect(family('rust-sweater')).toBe('orange')
    expect(family('beige-chinos')).toBe('beige')
    expect(family('brown-boots')).toBe('brown')
    expect(family('navy-blazer')).toBe('navy')
    expect(family('camel-coat')).toBe('beige')
    expect(family('sport-top')).toBe('red')
  })
})

describe('isNeutral', () => {
  it('treats black, white, grey, beige, brown and navy as neutral', () => {
    for (const hex of ['#141414', '#f7f5f0', '#8a8a8a', '#d2bf9d', '#6b4428', '#1f2a44']) {
      expect(isNeutral({ color: hex, kind: 'tshirt' })).toBe(true)
    }
  })

  it('treats real colours as not neutral', () => {
    expect(isNeutral({ color: '#3f6fb5', kind: 'tshirt' })).toBe(false)
    expect(isNeutral({ color: '#c0392b', kind: 'trousers' })).toBe(false)
  })

  it('treats jeans as neutral whatever their colour', () => {
    expect(isNeutral({ color: '#3f6fb5', kind: 'jeans' })).toBe(true)
  })
})

describe('hueDistance and colorRelation', () => {
  it('measures the short way round the colour wheel', () => {
    expect(hueDistance(10, 350)).toBe(20)
    expect(hueDistance(0, 180)).toBe(180)
    expect(hueDistance(200, 200)).toBe(0)
  })

  it('calls close hues related, far hues opposite, and the rest clashing', () => {
    expect(colorRelation('#c0392b', '#d9722b')).toBe('related') // red, orange
    expect(colorRelation('#3f6fb5', '#d9722b')).toBe('opposite') // blue, orange
    expect(colorRelation('#3f6fb5', '#2f6b4f')).toBe('clashing') // blue, green
  })
})

describe('isDark', () => {
  it('separates dark from light colours', () => {
    expect(isDark('#141414')).toBe(true)
    expect(isDark('#1f2a44')).toBe(true)
    expect(isDark('#f7f5f0')).toBe(false)
  })
})
