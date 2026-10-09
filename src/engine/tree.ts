import { colorFamily, colorRelation, isNeutral, lightness } from './color.ts'
import {
  piecesOf,
  type ColorFamily,
  type Formality,
  type Item,
  type Occasion,
  type Outfit,
  type Preferences,
  type Request,
} from './types.ts'

/*
 * THE DECISION TREE
 *
 * An outfit is judged by walking down a tree of yes/no questions until a
 * leaf is reached. The leaf is the verdict. The path taken is the
 * explanation shown in the "Why this outfit?" panel, so the app can never
 * explain an outfit differently from how it actually judged it.
 *
 * The tree is plain data (`TREE` at the bottom). Each question's logic lives
 * in `TESTS`. To change the styling rules, edit those two things.
 */

export type QuestionId =
  | 'occasionFit'
  | 'seasonFit'
  | 'levelsMatch'
  | 'severalColors'
  | 'anyColor'
  | 'contrast'
  | 'prefersMinimal'
  | 'colorsRelated'
  | 'colorsOpposite'
  | 'prefersBold'
  | 'favoriteColor'

export type Verdict = 'great' | 'good' | 'okay' | 'rejected'

export type LeafId =
  | 'rejectOccasion'
  | 'rejectSeason'
  | 'rejectLevels'
  | 'rejectClash'
  | 'neutralContrastMinimal'
  | 'neutralContrast'
  | 'neutralTonalMinimal'
  | 'neutralFlat'
  | 'favoriteAccent'
  | 'singleAccent'
  | 'harmonyFavorite'
  | 'harmony'
  | 'boldContrast'
  | 'contrastNotYourStyle'

export interface QuestionNode {
  type: 'question'
  id: QuestionId
  yes: TreeNode
  no: TreeNode
}

export interface LeafNode {
  type: 'leaf'
  id: LeafId
  verdict: Verdict
  /** 0–100. Used to rank outfits; rejected outfits score 0. */
  score: number
}

export type TreeNode = QuestionNode | LeafNode

export interface Context {
  request: Request
  preferences: Preferences
}

/** The concrete things an answer was based on, for the explanation text. */
export interface Facts {
  /** Names of the pieces the answer is about. */
  pieces?: string[]
  /** Colour families the answer is about. */
  colors?: ColorFamily[]
}

export interface Step {
  question: QuestionId
  answer: boolean
  facts: Facts
}

export interface Evaluation {
  steps: Step[]
  leaf: LeafNode
}

// ── The numbers behind the questions ────────────────────────────────────────

/** The dress level each occasion calls for, and how far a piece may be from it. */
export const OCCASION_RULES: Record<Occasion, { level: Formality; tolerance: number }> = {
  workout: { level: 1, tolerance: 0 },
  everyday: { level: 2, tolerance: 1 },
  office: { level: 3, tolerance: 1 },
  event: { level: 4, tolerance: 1 },
}

/** Pieces in one outfit may be at most this many dress levels apart. */
export const MAX_LEVEL_SPREAD = 1

/** Minimum lightness difference between top and bottom to count as contrast. */
export const MIN_CONTRAST = 0.25

// ── The questions ───────────────────────────────────────────────────────────

/** The non-neutral pieces, one per colour family. */
function accents(outfit: Outfit): Item[] {
  const seen = new Set<ColorFamily>()
  return piecesOf(outfit).filter((piece) => {
    if (isNeutral(piece)) return false
    const family = colorFamily(piece.color)
    if (seen.has(family)) return false
    seen.add(family)
    return true
  })
}

function families(items: Item[]): ColorFamily[] {
  return items.map((item) => colorFamily(item.color))
}

/** True when every pair of the given pieces has the given colour relation. */
function allPairs(items: Item[], relation: 'related' | 'opposite'): boolean {
  return items.every((a, index) =>
    items.slice(index + 1).every((b) => colorRelation(a.color, b.color) === relation),
  )
}

type Test = (outfit: Outfit, context: Context) => { answer: boolean; facts: Facts }

export const TESTS: Record<QuestionId, Test> = {
  /** Does every piece suit the occasion? */
  occasionFit(outfit, { request }) {
    const { level, tolerance } = OCCASION_RULES[request.occasion]
    const unsuited = piecesOf(outfit).filter(
      (piece) => Math.abs(piece.formality - level) > tolerance,
    )
    return { answer: unsuited.length === 0, facts: { pieces: unsuited.map((p) => p.name) } }
  },

  /** Can every piece be worn in this season? */
  seasonFit(outfit, { request }) {
    const unsuited = piecesOf(outfit).filter((piece) => !piece.seasons.includes(request.season))
    return { answer: unsuited.length === 0, facts: { pieces: unsuited.map((p) => p.name) } }
  },

  /** Are the pieces about equally dressed-up? */
  levelsMatch(outfit) {
    const sorted = [...piecesOf(outfit)].sort((a, b) => a.formality - b.formality)
    const lowest = sorted[0]
    const highest = sorted[sorted.length - 1]
    if (!lowest || !highest) return { answer: true, facts: {} }
    return {
      answer: highest.formality - lowest.formality <= MAX_LEVEL_SPREAD,
      facts: { pieces: [lowest.name, highest.name] },
    }
  },

  /** Does the outfit have two or more different non-neutral colours? */
  severalColors(outfit) {
    const colored = accents(outfit)
    return { answer: colored.length >= 2, facts: { colors: families(colored) } }
  },

  /** Does the outfit have any non-neutral colour at all? */
  anyColor(outfit) {
    const colored = accents(outfit)
    return { answer: colored.length >= 1, facts: { colors: families(colored) } }
  },

  /** Is there clear light/dark contrast between top and bottom? */
  contrast(outfit) {
    const difference = Math.abs(lightness(outfit.top.color) - lightness(outfit.bottom.color))
    return {
      answer: difference >= MIN_CONTRAST,
      facts: { pieces: [outfit.top.name, outfit.bottom.name] },
    }
  },

  prefersMinimal(_outfit, { preferences }) {
    return { answer: preferences.style === 'minimal', facts: {} }
  },

  /** Are the colours neighbours on the colour wheel? */
  colorsRelated(outfit) {
    const colored = accents(outfit)
    return { answer: allPairs(colored, 'related'), facts: { colors: families(colored) } }
  },

  /** Are there exactly two colours, from opposite sides of the colour wheel? */
  colorsOpposite(outfit) {
    const colored = accents(outfit)
    return {
      answer: colored.length === 2 && allPairs(colored, 'opposite'),
      facts: { colors: families(colored) },
    }
  },

  prefersBold(_outfit, { preferences }) {
    return { answer: preferences.style === 'bold', facts: {} }
  },

  /** Is one of the outfit's colours a favourite of the user? */
  favoriteColor(outfit, { preferences }) {
    const matches = families(accents(outfit)).filter((family) =>
      preferences.favoriteColors.includes(family),
    )
    return { answer: matches.length > 0, facts: { colors: matches } }
  },
}

// ── The tree ────────────────────────────────────────────────────────────────

function ask(id: QuestionId, yes: TreeNode, no: TreeNode): QuestionNode {
  return { type: 'question', id, yes, no }
}

function leaf(id: LeafId, verdict: Verdict, score: number): LeafNode {
  return { type: 'leaf', id, verdict, score }
}

const reject = (id: LeafId) => leaf(id, 'rejected', 0)

/** Only neutrals: judged on contrast and on whether the user likes it quiet. */
const neutralsOnly = ask(
  'contrast',
  ask(
    'prefersMinimal',
    leaf('neutralContrastMinimal', 'great', 90),
    leaf('neutralContrast', 'good', 72),
  ),
  ask('prefersMinimal', leaf('neutralTonalMinimal', 'good', 70), leaf('neutralFlat', 'okay', 50)),
)

/** One colour with neutrals: a safe formula, best in a favourite colour. */
const oneColor = ask(
  'favoriteColor',
  leaf('favoriteAccent', 'great', 95),
  leaf('singleAccent', 'good', 80),
)

/** Several colours: they must be neighbours, or a deliberate bold contrast. */
const severalColors = ask(
  'colorsRelated',
  ask('favoriteColor', leaf('harmonyFavorite', 'great', 90), leaf('harmony', 'good', 76)),
  ask(
    'colorsOpposite',
    ask('prefersBold', leaf('boldContrast', 'great', 88), leaf('contrastNotYourStyle', 'okay', 52)),
    reject('rejectClash'),
  ),
)

const colorQuestions = ask('severalColors', severalColors, ask('anyColor', oneColor, neutralsOnly))

/** Practical questions come first; an unwearable outfit is never judged on colour. */
export const TREE: TreeNode = ask(
  'occasionFit',
  ask(
    'seasonFit',
    ask('levelsMatch', colorQuestions, reject('rejectLevels')),
    reject('rejectSeason'),
  ),
  reject('rejectOccasion'),
)

/** Walks the tree for one outfit and records every answer on the way. */
export function evaluate(outfit: Outfit, context: Context, tree: TreeNode = TREE): Evaluation {
  const steps: Step[] = []
  let node = tree
  while (node.type === 'question') {
    const { answer, facts } = TESTS[node.id](outfit, context)
    steps.push({ question: node.id, answer, facts })
    node = answer ? node.yes : node.no
  }
  return { steps, leaf: node }
}

/** Every leaf of a tree, for tests and for documentation. */
export function leavesOf(node: TreeNode): LeafNode[] {
  return node.type === 'leaf' ? [node] : [...leavesOf(node.yes), ...leavesOf(node.no)]
}
