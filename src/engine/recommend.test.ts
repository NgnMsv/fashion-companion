import { describe, expect, it } from 'vitest'
import { SAMPLE_PREFERENCES } from '../data/sample.ts'
import { classic, COLORS, englishSample, makeItem } from '../test/helpers.tsx'
import { buildCombinations, recommend, seasonOf } from './recommend.ts'
import { OCCASIONS, outfitKey, piecesOf, SEASONS, type Item, type Request } from './types.ts'

const { white, black, blue, green } = COLORS
const everyday: Request = { occasion: 'everyday', season: 'spring' }

function basics(): Item[] {
  return [makeItem('tshirt', white), makeItem('trousers', black), makeItem('sneakers', white)]
}

describe('recommend: incomplete wardrobes', () => {
  it('reports all three required categories for an empty wardrobe', () => {
    expect(recommend({ items: [], preferences: classic, request: everyday })).toEqual({
      status: 'missing-pieces',
      missing: ['top', 'bottom', 'shoes'],
    })
  })

  it('reports exactly the category that is missing', () => {
    const items = [makeItem('tshirt', white), makeItem('trousers', black)]
    expect(recommend({ items, preferences: classic, request: everyday })).toEqual({
      status: 'missing-pieces',
      missing: ['shoes'],
    })
  })

  it('does not require outerwear', () => {
    const result = recommend({ items: basics(), preferences: classic, request: everyday })
    expect(result.status).toBe('ok')
  })

  it('treats unavailable pieces as if they were not there', () => {
    const [top, bottom, shoes] = basics()
    if (!top || !bottom || !shoes) throw new Error('basics() is incomplete')
    const items = [top, bottom, { ...shoes, available: false }]
    expect(recommend({ items, preferences: classic, request: everyday })).toEqual({
      status: 'missing-pieces',
      missing: ['shoes'],
    })
  })
})

describe('recommend: results', () => {
  it('returns the single possible outfit with its evaluation', () => {
    const items = basics()
    const result = recommend({ items, preferences: classic, request: everyday })
    if (result.status !== 'ok') throw new Error(`Expected ok, got ${result.status}`)

    expect(result.considered).toBe(1)
    expect(result.recommendations).toHaveLength(1)
    expect(result.recommendations[0]?.evaluation.leaf.id).toBe('neutralContrast')
    expect(result.recommendations[0]?.key).toBe(items.map((item) => item.id).join('+') + '+-')
  })

  it('never returns a rejected outfit', () => {
    const items = [...basics(), makeItem('tshirt', blue), makeItem('trousers', green)]
    const result = recommend({ items, preferences: classic, request: everyday, limit: 10 })
    if (result.status !== 'ok') throw new Error(`Expected ok, got ${result.status}`)

    expect(result.considered).toBe(4)
    // blue top + green trousers clash, so only three remain
    expect(result.recommendations).toHaveLength(3)
    for (const { evaluation } of result.recommendations) {
      expect(evaluation.leaf.verdict).not.toBe('rejected')
    }
  })

  it('puts the best-scoring outfit first', () => {
    const items = [...basics(), makeItem('tshirt', blue)]
    const preferences = { ...classic, favoriteColors: ['blue' as const] }
    const result = recommend({ items, preferences, request: everyday })
    if (result.status !== 'ok') throw new Error(`Expected ok, got ${result.status}`)

    expect(result.recommendations[0]?.evaluation.leaf.id).toBe('favoriteAccent')
    const scores = result.recommendations.map((entry) => entry.evaluation.leaf.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('respects the limit, including a limit of zero', () => {
    const items = englishSample()
    const input = { items, preferences: SAMPLE_PREFERENCES, request: everyday }
    const two = recommend({ ...input, limit: 2 })
    const none = recommend({ ...input, limit: 0 })
    expect(two.status === 'ok' && two.recommendations).toHaveLength(2)
    expect(none.status === 'ok' && none.recommendations).toHaveLength(0)
  })

  it('is deterministic: the same input and seed give the same outfits', () => {
    const input = { items: englishSample(), preferences: SAMPLE_PREFERENCES, request: everyday }
    expect(recommend({ ...input, seed: 3 })).toEqual(recommend({ ...input, seed: 3 }))
  })

  it('keeps the quality when shuffled: another seed never lowers the best score', () => {
    const input = { items: englishSample(), preferences: SAMPLE_PREFERENCES, request: everyday }
    const best = (seed: number) => {
      const result = recommend({ ...input, seed })
      return result.status === 'ok' ? result.recommendations[0]?.evaluation.leaf.score : undefined
    }
    expect(best(1)).toBe(best(0))
    expect(best(7)).toBe(best(0))
  })

  it('varies the picks instead of repeating the same pieces', () => {
    const result = recommend({
      items: englishSample(),
      preferences: SAMPLE_PREFERENCES,
      request: { occasion: 'everyday', season: 'autumn' },
    })
    if (result.status !== 'ok') throw new Error(`Expected ok, got ${result.status}`)

    const tops = result.recommendations.map((entry) => entry.outfit.top.id)
    expect(new Set(tops).size).toBe(tops.length)
    const keys = result.recommendations.map((entry) => entry.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('recommend: dismissed outfits', () => {
  it('leaves out outfits the user dismissed', () => {
    const items = [...basics(), makeItem('tshirt', blue)]
    const first = recommend({ items, preferences: classic, request: everyday })
    if (first.status !== 'ok') throw new Error(`Expected ok, got ${first.status}`)
    const dismissedKey = first.recommendations[0]?.key ?? ''

    const second = recommend({
      items,
      preferences: classic,
      request: everyday,
      hidden: new Set([dismissedKey]),
    })
    if (second.status !== 'ok') throw new Error(`Expected ok, got ${second.status}`)
    expect(second.recommendations.map((entry) => entry.key)).not.toContain(dismissedKey)
    expect(second.recommendations).toHaveLength(1)
  })

  it('says so when the only passing outfit was dismissed', () => {
    const items = basics()
    const [top, bottom, shoes] = items
    if (!top || !bottom || !shoes) throw new Error('basics() is incomplete')
    const key = outfitKey({ top, bottom, shoes })
    const result = recommend({
      items,
      preferences: classic,
      request: everyday,
      hidden: new Set([key]),
    })
    expect(result).toEqual({ status: 'no-match', considered: 1, rejections: [], dismissed: 1 })
  })
})

describe('recommend: nothing passes', () => {
  it('counts the reasons, most common first', () => {
    const items = [
      makeItem('tshirt', white), // casual: wrong for a workout
      makeItem('tshirt', white, { formality: 1, seasons: ['summer'] }), // sporty, summer only
      makeItem('trousers', black, { formality: 1 }),
      makeItem('sneakers', white, { formality: 1 }),
      makeItem('sneakers', black, { formality: 1 }),
    ]
    const result = recommend({
      items,
      preferences: classic,
      request: { occasion: 'workout', season: 'winter' },
    })
    expect(result).toEqual({
      status: 'no-match',
      considered: 4,
      rejections: [
        { leaf: 'rejectOccasion', count: 2 },
        { leaf: 'rejectSeason', count: 2 },
      ],
      dismissed: 0,
    })
  })
})

describe('outerwear', () => {
  const coat = makeItem('coat', black, { seasons: ['autumn', 'winter'] })
  const items = [...basics(), coat]

  it('is added in autumn and winter when the wardrobe has a suitable piece', () => {
    for (const season of ['autumn', 'winter'] as const) {
      const outfits = buildCombinations(items, { occasion: 'everyday', season })
      expect(outfits).toHaveLength(1)
      expect(outfits[0]?.outerwear).toBe(coat)
    }
  })

  it('is left out in spring and summer', () => {
    for (const season of ['spring', 'summer'] as const) {
      const outfits = buildCombinations(items, { occasion: 'everyday', season })
      expect(outfits[0]?.outerwear).toBeUndefined()
    }
  })

  it('is left out when no outerwear suits the season', () => {
    const springJacket = makeItem('jacket', black, { seasons: ['spring'] })
    const outfits = buildCombinations([...basics(), springJacket], {
      occasion: 'everyday',
      season: 'winter',
    })
    expect(outfits[0]?.outerwear).toBeUndefined()
  })

  it('is left out when it would not suit the occasion, instead of ruining every outfit', () => {
    const sporty = [
      makeItem('tshirt', white, { formality: 1 }),
      makeItem('trousers', black, { formality: 1 }),
      makeItem('sneakers', white, { formality: 1 }),
      coat,
    ]
    const result = recommend({
      items: sporty,
      preferences: classic,
      request: { occasion: 'workout', season: 'winter' },
    })
    if (result.status !== 'ok') throw new Error(`Expected ok, got ${result.status}`)
    expect(result.recommendations[0]?.outfit.outerwear).toBeUndefined()
  })

  it('offers one combination per suitable outerwear piece', () => {
    const second = makeItem('jacket', blue, { seasons: ['winter'] })
    const outfits = buildCombinations([...items, second], { occasion: 'everyday', season: 'winter' })
    expect(outfits.map((outfit) => outfit.outerwear?.id)).toEqual([coat.id, second.id])
  })
})

describe('the sample wardrobe', () => {
  const items = englishSample()

  it('has 22 pieces', () => {
    expect(items).toHaveLength(22)
  })

  it.each(SEASONS.flatMap((season) => OCCASIONS.map((occasion) => ({ occasion, season }))))(
    'gives at least one look for $occasion in $season',
    (request) => {
      const result = recommend({ items, preferences: SAMPLE_PREFERENCES, request })
      if (result.status !== 'ok') throw new Error(`Expected ok, got ${result.status}`)
      expect(result.recommendations.length).toBeGreaterThan(0)

      for (const { outfit, evaluation } of result.recommendations) {
        expect(evaluation.leaf.verdict).not.toBe('rejected')
        for (const piece of piecesOf(outfit)) expect(piece.seasons).toContain(request.season)
      }
    },
  )
})

describe('seasonOf', () => {
  it.each([
    ['2026-01-15', 'winter'],
    ['2026-03-01', 'spring'],
    ['2026-05-31', 'spring'],
    ['2026-06-01', 'summer'],
    ['2026-09-01', 'autumn'],
    ['2026-11-30', 'autumn'],
    ['2026-12-01', 'winter'],
  ] as const)('%s is in %s', (date, season) => {
    expect(seasonOf(new Date(`${date}T12:00:00`))).toBe(season)
  })
})
