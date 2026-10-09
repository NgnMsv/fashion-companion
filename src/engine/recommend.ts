import { evaluate, OCCASION_RULES, type Context, type Evaluation, type LeafId } from './tree.ts'
import {
  categoryOf,
  outfitKey,
  piecesOf,
  type Category,
  type Item,
  type Outfit,
  type Preferences,
  type Request,
  type Season,
} from './types.ts'

/*
 * Turns a wardrobe into a short list of recommended outfits:
 *
 *   1. build every possible combination of the available pieces
 *   2. judge each one with the decision tree
 *   3. drop the rejected and the ones the user dismissed
 *   4. rank the rest and pick a varied few
 *
 * Pure and deterministic: the same input (including `seed`) always gives the
 * same output, which is what makes it easy to test.
 */

export interface RecommendInput {
  items: Item[]
  preferences: Preferences
  request: Request
  /** Keys of outfits the user dismissed ("Not for me"). */
  hidden?: ReadonlySet<string>
  /** How many outfits to return. */
  limit?: number
  /** Changes which of several equally good outfits come first ("Shuffle"). */
  seed?: number
}

export interface Recommendation {
  key: string
  outfit: Outfit
  evaluation: Evaluation
}

export type RecommendResult =
  | { status: 'ok'; recommendations: Recommendation[]; considered: number }
  /** The wardrobe lacks a top, a bottom, or shoes. */
  | { status: 'missing-pieces'; missing: Category[] }
  /** Combinations exist, but the tree rejected (or the user dismissed) all of them. */
  | {
      status: 'no-match'
      considered: number
      /** How many combinations ended in each rejecting leaf, most common first. */
      rejections: { leaf: LeafId; count: number }[]
      dismissed: number
    }

export const DEFAULT_LIMIT = 3

/** In these seasons an outfit gets a jacket or coat when the wardrobe has one. */
export const OUTERWEAR_SEASONS: readonly Season[] = ['autumn', 'winter']

/** Safety cap so a very large wardrobe cannot freeze the page. */
export const MAX_COMBINATIONS = 50_000

const REQUIRED: readonly Category[] = ['top', 'bottom', 'shoes']

/** A small deterministic hash, used to order equally scored outfits. */
function hash(text: string, seed: number): number {
  let value = 2166136261 ^ seed
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

/**
 * Outerwear worth considering: it has to suit the season and the occasion by
 * itself. Otherwise one unsuitable jacket would get every outfit rejected
 * (think of a wool coat on a winter workout); the outfit then goes without.
 */
function outerwearOptions(outerwear: Item[], request: Request): (Item | undefined)[] {
  if (!OUTERWEAR_SEASONS.includes(request.season)) return [undefined]
  const { level, tolerance } = OCCASION_RULES[request.occasion]
  const wearable = outerwear.filter(
    (item) =>
      item.seasons.includes(request.season) && Math.abs(item.formality - level) <= tolerance,
  )
  return wearable.length > 0 ? wearable : [undefined]
}

export function buildCombinations(items: Item[], request: Request): Outfit[] {
  const by = (category: Category) =>
    items.filter((item) => item.available && categoryOf(item) === category)
  const layers = outerwearOptions(by('outerwear'), request)
  const outfits: Outfit[] = []

  for (const top of by('top')) {
    for (const bottom of by('bottom')) {
      for (const shoes of by('shoes')) {
        for (const outerwear of layers) {
          if (outfits.length >= MAX_COMBINATIONS) return outfits
          outfits.push(outerwear ? { top, bottom, shoes, outerwear } : { top, bottom, shoes })
        }
      }
    }
  }
  return outfits
}

/**
 * Picks `limit` outfits from a ranked list while avoiding repeats: each time
 * a piece has already been used, the next outfit containing it is pushed down.
 */
function pickVaried(ranked: Recommendation[], limit: number): Recommendation[] {
  const REPEAT_PENALTY = 12
  const picked: Recommendation[] = []
  const used = new Map<string, number>()
  const pool = [...ranked]

  while (picked.length < limit && pool.length > 0) {
    let bestIndex = 0
    let bestValue = -Infinity
    pool.forEach((candidate, index) => {
      const repeats = piecesOf(candidate.outfit).reduce(
        (sum, piece) => sum + (used.get(piece.id) ?? 0),
        0,
      )
      const value = candidate.evaluation.leaf.score - repeats * REPEAT_PENALTY
      // Strictly greater: on a tie the earlier (higher ranked) outfit wins.
      if (value > bestValue) {
        bestValue = value
        bestIndex = index
      }
    })
    const [best] = pool.splice(bestIndex, 1)
    if (!best) break
    picked.push(best)
    for (const piece of piecesOf(best.outfit)) used.set(piece.id, (used.get(piece.id) ?? 0) + 1)
  }
  return picked
}

export function recommend({
  items,
  preferences,
  request,
  hidden = new Set(),
  limit = DEFAULT_LIMIT,
  seed = 0,
}: RecommendInput): RecommendResult {
  const missing = REQUIRED.filter(
    (category) => !items.some((item) => item.available && categoryOf(item) === category),
  )
  if (missing.length > 0) return { status: 'missing-pieces', missing }

  const context: Context = { request, preferences }
  const combinations = buildCombinations(items, request)
  const accepted: Recommendation[] = []
  const rejectionCounts = new Map<LeafId, number>()
  let dismissed = 0

  for (const outfit of combinations) {
    const evaluation = evaluate(outfit, context)
    const key = outfitKey(outfit)
    if (evaluation.leaf.verdict === 'rejected') {
      rejectionCounts.set(evaluation.leaf.id, (rejectionCounts.get(evaluation.leaf.id) ?? 0) + 1)
    } else if (hidden.has(key)) {
      dismissed += 1
    } else {
      accepted.push({ key, outfit, evaluation })
    }
  }

  if (accepted.length === 0) {
    const rejections = [...rejectionCounts]
      .map(([leaf, count]) => ({ leaf, count }))
      .sort((a, b) => b.count - a.count)
    return { status: 'no-match', considered: combinations.length, rejections, dismissed }
  }

  accepted.sort(
    (a, b) =>
      b.evaluation.leaf.score - a.evaluation.leaf.score || hash(a.key, seed) - hash(b.key, seed),
  )
  return {
    status: 'ok',
    recommendations: pickVaried(accepted, Math.max(0, limit)),
    considered: combinations.length,
  }
}

/** The season for a date, by meteorological seasons of the northern hemisphere. */
export function seasonOf(date: Date): Season {
  const month = date.getMonth() // 0 = January
  if (month >= 2 && month <= 4) return 'spring'
  if (month >= 5 && month <= 7) return 'summer'
  if (month >= 8 && month <= 10) return 'autumn'
  return 'winter'
}
