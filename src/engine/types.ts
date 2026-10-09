/*
 * The data model. Everything the app stores or reasons about is described
 * here; the engine, the storage layer and the UI all share these types.
 */

export const CATEGORIES = ['outerwear', 'top', 'bottom', 'shoes'] as const
export type Category = (typeof CATEGORIES)[number]

/** The concrete kind of garment. It decides the category and the drawing. */
export const KINDS = {
  tshirt: 'top',
  shirt: 'top',
  sweater: 'top',
  trousers: 'bottom',
  jeans: 'bottom',
  shorts: 'bottom',
  skirt: 'bottom',
  sneakers: 'shoes',
  boots: 'shoes',
  loafers: 'shoes',
  jacket: 'outerwear',
  blazer: 'outerwear',
  coat: 'outerwear',
} as const satisfies Record<string, Category>
export type Kind = keyof typeof KINDS
export const KIND_LIST = Object.keys(KINDS) as Kind[]

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const
export type Season = (typeof SEASONS)[number]

/** How dressed-up a piece is: 1 sporty, 2 casual, 3 smart, 4 formal. */
export const FORMALITY_LEVELS = [1, 2, 3, 4] as const
export type Formality = (typeof FORMALITY_LEVELS)[number]

export const OCCASIONS = ['workout', 'everyday', 'office', 'event'] as const
export type Occasion = (typeof OCCASIONS)[number]

export const STYLES = ['minimal', 'classic', 'bold'] as const
export type Style = (typeof STYLES)[number]

export const COLOR_FAMILIES = [
  'black',
  'white',
  'grey',
  'beige',
  'brown',
  'navy',
  'blue',
  'green',
  'yellow',
  'orange',
  'red',
  'pink',
  'purple',
] as const
export type ColorFamily = (typeof COLOR_FAMILIES)[number]

export interface Item {
  id: string
  name: string
  kind: Kind
  /** "#rrggbb" */
  color: string
  seasons: Season[]
  formality: Formality
  /** False while the piece is in the laundry, lent out, etc. */
  available: boolean
  /** True when the user uploaded a photo (stored separately, by item id). */
  hasPhoto: boolean
}

export interface Preferences {
  style: Style
  favoriteColors: ColorFamily[]
  /** The occasions the user dresses for most; the first one is the default. */
  occasions: Occasion[]
}

export interface Outfit {
  top: Item
  bottom: Item
  shoes: Item
  outerwear?: Item
}

/** What the user asked for when requesting outfits. */
export interface Request {
  occasion: Occasion
  season: Season
}

export function categoryOf(item: Pick<Item, 'kind'>): Category {
  return KINDS[item.kind]
}

export function piecesOf(outfit: Outfit): Item[] {
  return [outfit.outerwear, outfit.top, outfit.bottom, outfit.shoes].filter(
    (piece): piece is Item => piece !== undefined,
  )
}

/** A stable identifier for a combination of pieces. */
export function outfitKey(outfit: Outfit): string {
  return [outfit.top.id, outfit.bottom.id, outfit.shoes.id, outfit.outerwear?.id ?? '-'].join('+')
}
