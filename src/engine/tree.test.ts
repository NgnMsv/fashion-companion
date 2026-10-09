import { describe, expect, it } from 'vitest'
import { classic, COLORS, makeItem } from '../test/helpers.tsx'
import { evaluate, leavesOf, TREE, type Context, type LeafId, type TreeNode } from './tree.ts'
import type { Item, Outfit, Preferences } from './types.ts'

const { white, black, blue, green, red, orange } = COLORS

function context(preferences: Partial<Preferences> = {}, request = {}): Context {
  return {
    request: { occasion: 'everyday', season: 'spring', ...request },
    preferences: { ...classic, ...preferences },
  }
}

function outfit(top: Item, bottom: Item, shoes?: Item, outerwear?: Item): Outfit {
  const base = { top, bottom, shoes: shoes ?? makeItem('sneakers', white) }
  return outerwear ? { ...base, outerwear } : base
}

const tee = (color: string, overrides: Partial<Item> = {}) => makeItem('tshirt', color, overrides)
const trousers = (color: string, overrides: Partial<Item> = {}) =>
  makeItem('trousers', color, overrides)

describe('the shape of the tree', () => {
  it('has 14 leaves, each with a different id', () => {
    const ids = leavesOf(TREE).map((leaf) => leaf.id)
    expect(ids).toHaveLength(14)
    expect(new Set(ids).size).toBe(14)
  })

  it('scores rejected leaves 0 and every other leaf between 1 and 100', () => {
    for (const leaf of leavesOf(TREE)) {
      if (leaf.verdict === 'rejected') expect(leaf.score).toBe(0)
      else expect(leaf.score).toBeGreaterThan(0)
      expect(leaf.score).toBeLessThanOrEqual(100)
    }
  })

  it('ranks verdicts in order: every great above every good above every okay', () => {
    const scores = (verdict: string) =>
      leavesOf(TREE)
        .filter((leaf) => leaf.verdict === verdict)
        .map((leaf) => leaf.score)
    expect(Math.min(...scores('great'))).toBeGreaterThan(Math.max(...scores('good')))
    expect(Math.min(...scores('good'))).toBeGreaterThan(Math.max(...scores('okay')))
  })

  it('asks the practical questions before any colour question', () => {
    const { steps } = evaluate(outfit(tee(blue), trousers(black)), context())
    expect(steps.slice(0, 3).map((step) => step.question)).toEqual([
      'occasionFit',
      'seasonFit',
      'levelsMatch',
    ])
  })
})

describe('every leaf can be reached', () => {
  const cases: [LeafId, Outfit, Context][] = [
    ['rejectOccasion', outfit(tee(white, { formality: 4 }), trousers(black)), context()],
    ['rejectSeason', outfit(tee(white, { seasons: ['winter'] }), trousers(black)), context()],
    [
      'rejectLevels',
      outfit(tee(white, { formality: 3 }), trousers(black), makeItem('sneakers', white, { formality: 1 })),
      context(),
    ],
    ['favoriteAccent', outfit(tee(blue), trousers(black)), context({ favoriteColors: ['blue'] })],
    ['singleAccent', outfit(tee(blue), trousers(black)), context()],
    ['harmonyFavorite', outfit(tee(red), trousers(orange)), context({ favoriteColors: ['red'] })],
    ['harmony', outfit(tee(red), trousers(orange)), context()],
    ['boldContrast', outfit(tee(blue), trousers(orange)), context({ style: 'bold' })],
    ['contrastNotYourStyle', outfit(tee(blue), trousers(orange)), context()],
    ['rejectClash', outfit(tee(blue), trousers(green)), context()],
    ['neutralContrastMinimal', outfit(tee(white), trousers(black)), context({ style: 'minimal' })],
    ['neutralContrast', outfit(tee(white), trousers(black)), context()],
    ['neutralTonalMinimal', outfit(tee(black), trousers(black)), context({ style: 'minimal' })],
    ['neutralFlat', outfit(tee(black), trousers(black)), context()],
  ]

  it.each(cases)('%s', (expected, candidate, ctx) => {
    expect(evaluate(candidate, ctx).leaf.id).toBe(expected)
  })

  it('covers all leaves of the tree', () => {
    const covered = new Set(cases.map(([id]) => id))
    expect(leavesOf(TREE).every((leaf) => covered.has(leaf.id))).toBe(true)
  })
})

describe('the explanation', () => {
  it('records each question with its answer, and they lead to the leaf', () => {
    const evaluation = evaluate(outfit(tee(blue), trousers(black)), context())

    // Replaying the recorded answers on the tree must end at the same leaf.
    let node: TreeNode = TREE
    for (const step of evaluation.steps) {
      if (node.type !== 'question') throw new Error('More steps than questions')
      expect(node.id).toBe(step.question)
      node = step.answer ? node.yes : node.no
    }
    expect(node).toBe(evaluation.leaf)
  })

  it('names the pieces that do not suit the occasion', () => {
    const gown = tee(white, { formality: 4, name: 'Dress shirt' })
    const { steps } = evaluate(outfit(gown, trousers(black)), context())
    expect(steps).toEqual([
      { question: 'occasionFit', answer: false, facts: { pieces: ['Dress shirt'] } },
    ])
  })

  it('names the pieces that do not suit the season', () => {
    const wool = tee(white, { seasons: ['winter'], name: 'Wool top' })
    const { steps } = evaluate(outfit(wool, trousers(black)), context({}, { season: 'summer' }))
    expect(steps.at(-1)).toEqual({
      question: 'seasonFit',
      answer: false,
      facts: { pieces: ['Wool top'] },
    })
  })

  it('names the colours it found', () => {
    const { steps } = evaluate(outfit(tee(red), trousers(orange)), context())
    const several = steps.find((step) => step.question === 'severalColors')
    expect(several).toEqual({
      question: 'severalColors',
      answer: true,
      facts: { colors: ['red', 'orange'] },
    })
  })

  it('names the favourite colour that matched', () => {
    const ctx = context({ favoriteColors: ['green', 'blue'] })
    const { steps } = evaluate(outfit(tee(blue), trousers(black)), ctx)
    expect(steps.at(-1)).toEqual({
      question: 'favoriteColor',
      answer: true,
      facts: { colors: ['blue'] },
    })
  })
})

describe('occasion rules', () => {
  it('allows one dress level of slack for everyday, office and event', () => {
    const smart = outfit(
      tee(white, { formality: 3 }),
      trousers(black, { formality: 3 }),
      makeItem('loafers', black, { formality: 3 }),
    )
    for (const occasion of ['everyday', 'office', 'event'] as const) {
      expect(evaluate(smart, context({}, { occasion })).leaf.verdict).not.toBe('rejected')
    }
  })

  it('allows only sporty pieces for a workout', () => {
    const casual = outfit(tee(white), trousers(black))
    expect(evaluate(casual, context({}, { occasion: 'workout' })).leaf.id).toBe('rejectOccasion')

    const sporty = outfit(
      tee(white, { formality: 1 }),
      trousers(black, { formality: 1 }),
      makeItem('sneakers', white, { formality: 1 }),
    )
    expect(evaluate(sporty, context({}, { occasion: 'workout' })).leaf.verdict).not.toBe('rejected')
  })

  it('judges outerwear like any other piece', () => {
    const coat = makeItem('coat', black, { formality: 4, name: 'Opera coat' })
    const result = evaluate(outfit(tee(white), trousers(black), undefined, coat), context())
    expect(result.leaf.id).toBe('rejectOccasion')
    expect(result.steps[0]?.facts.pieces).toEqual(['Opera coat'])
  })
})

describe('colour rules', () => {
  it('treats blue jeans as a neutral, so a red top with jeans is one colour', () => {
    const jeans = makeItem('jeans', blue)
    expect(evaluate(outfit(tee(red), jeans), context()).leaf.id).toBe('singleAccent')
  })

  it('counts two pieces of the same colour family as one colour', () => {
    const lightBlue = tee('#8fb1d9')
    expect(evaluate(outfit(lightBlue, trousers(blue)), context()).leaf.id).toBe('singleAccent')
  })

  it('rejects three colours unless they are all neighbours', () => {
    const shoes = makeItem('sneakers', blue)
    expect(evaluate(outfit(tee(red), trousers(orange), shoes), context()).leaf.id).toBe(
      'rejectClash',
    )
  })

  it('counts the colour of the shoes and the outerwear too', () => {
    const greenShoes = makeItem('sneakers', green)
    expect(evaluate(outfit(tee(white), trousers(black), greenShoes), context()).leaf.id).toBe(
      'singleAccent',
    )
    const blueCoat = makeItem('coat', blue)
    expect(
      evaluate(outfit(tee(white), trousers(black), undefined, blueCoat), context()).leaf.id,
    ).toBe('singleAccent')
  })

  it('does not count a favourite neutral as a favourite colour in the outfit', () => {
    const ctx = context({ favoriteColors: ['black'] })
    expect(evaluate(outfit(tee(blue), trousers(black)), ctx).leaf.id).toBe('singleAccent')
  })
})
