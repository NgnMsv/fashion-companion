import { describe, expect, it } from 'vitest'
import { COLORS, makeItem } from '../../test/helpers.tsx'
import { averageCenterColor } from './photo.ts'
import { filterItems, groupByCategory, hasActiveFilters, NO_FILTERS } from './filter.ts'

const tee = makeItem('tshirt', COLORS.white, { name: 'White tee', seasons: ['summer'] })
const shirt = makeItem('shirt', COLORS.blue, { name: 'Blue Oxford shirt', formality: 3 })
const jeans = makeItem('jeans', COLORS.blue, { name: 'Blue jeans' })
const boots = makeItem('boots', COLORS.black, { name: 'Black boots', seasons: ['winter'] })
const items = [boots, jeans, shirt, tee]

describe('filterItems', () => {
  it('returns everything when no filter is set', () => {
    expect(filterItems(items, NO_FILTERS)).toEqual(items)
    expect(hasActiveFilters(NO_FILTERS)).toBe(false)
  })

  it('searches names without caring about case or surrounding spaces', () => {
    expect(filterItems(items, { ...NO_FILTERS, search: '  BLUE ' })).toEqual([jeans, shirt])
  })

  it('filters by category, colour, season and dress level', () => {
    expect(filterItems(items, { ...NO_FILTERS, category: 'top' })).toEqual([shirt, tee])
    expect(filterItems(items, { ...NO_FILTERS, color: 'blue' })).toEqual([jeans, shirt])
    expect(filterItems(items, { ...NO_FILTERS, season: 'winter' })).toEqual([boots, jeans, shirt])
    expect(filterItems(items, { ...NO_FILTERS, formality: 3 })).toEqual([shirt])
  })

  it('combines filters: a piece must match all of them', () => {
    const filters = { ...NO_FILTERS, color: 'blue' as const, category: 'bottom' as const }
    expect(filterItems(items, filters)).toEqual([jeans])
    expect(hasActiveFilters(filters)).toBe(true)
    expect(filterItems(items, { ...filters, search: 'shirt' })).toEqual([])
  })
})

describe('groupByCategory', () => {
  it('groups in wearing order, sorts by name, and skips empty categories', () => {
    expect(groupByCategory(items)).toEqual([
      { category: 'top', items: [shirt, tee] },
      { category: 'bottom', items: [jeans] },
      { category: 'shoes', items: [boots] },
    ])
  })
})

describe('averageCenterColor', () => {
  it('averages only the middle of the picture', () => {
    // A 4x4 image: white border, pure red 2x2 centre.
    const side = 4
    const pixels = new Uint8ClampedArray(side * side * 4).fill(255)
    for (const [x, y] of [[1, 1], [2, 1], [1, 2], [2, 2]] as const) {
      const offset = (y * side + x) * 4
      pixels[offset + 1] = 0
      pixels[offset + 2] = 0
    }
    expect(averageCenterColor(pixels, side)).toBe('#ff0000')
  })
})
