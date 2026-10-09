import type { Formality, Item, Kind, Preferences, Season } from '../engine/types.ts'
import type { MessageKey, Translate } from '../i18n/index.tsx'

/*
 * The sample wardrobe behind "Try with sample wardrobe". The pieces are
 * invented and drawn by the app itself (see ui/Garment.tsx); there are no
 * product photos and no brands.
 */

const ALL: Season[] = ['spring', 'summer', 'autumn', 'winter']
const WARM: Season[] = ['spring', 'summer', 'autumn']
const COLD: Season[] = ['autumn', 'winter']

interface SampleItem {
  id: string
  kind: Kind
  color: string
  seasons: Season[]
  formality: Formality
}

export const SAMPLE_ITEMS: SampleItem[] = [
  { id: 'white-tee', kind: 'tshirt', color: '#f5f3ee', seasons: WARM, formality: 2 },
  { id: 'black-tee', kind: 'tshirt', color: '#161616', seasons: WARM, formality: 2 },
  { id: 'blue-oxford', kind: 'shirt', color: '#8fb1d9', seasons: ALL, formality: 3 },
  { id: 'white-shirt', kind: 'shirt', color: '#ffffff', seasons: ALL, formality: 4 },
  { id: 'grey-knit', kind: 'sweater', color: '#8c8c8c', seasons: ['autumn', 'winter', 'spring'], formality: 3 },
  { id: 'rust-sweater', kind: 'sweater', color: '#b5522d', seasons: COLD, formality: 2 },
  { id: 'green-knit', kind: 'sweater', color: '#2f6b4f', seasons: COLD, formality: 2 },
  { id: 'sport-top', kind: 'tshirt', color: '#d63c3c', seasons: ALL, formality: 1 },

  { id: 'blue-jeans', kind: 'jeans', color: '#3f5f8a', seasons: ALL, formality: 2 },
  { id: 'black-trousers', kind: 'trousers', color: '#1a1a1a', seasons: ALL, formality: 4 },
  { id: 'beige-chinos', kind: 'trousers', color: '#cbb894', seasons: WARM, formality: 3 },
  { id: 'olive-shorts', kind: 'shorts', color: '#6b7a3a', seasons: ['summer'], formality: 2 },
  { id: 'grey-joggers', kind: 'trousers', color: '#6e6e6e', seasons: ALL, formality: 1 },
  { id: 'black-skirt', kind: 'skirt', color: '#141414', seasons: ALL, formality: 3 },

  { id: 'white-sneakers', kind: 'sneakers', color: '#f2f2f2', seasons: WARM, formality: 2 },
  { id: 'running-shoes', kind: 'sneakers', color: '#2b2b2b', seasons: ALL, formality: 1 },
  { id: 'brown-boots', kind: 'boots', color: '#5a3a22', seasons: COLD, formality: 3 },
  { id: 'black-loafers', kind: 'loafers', color: '#151515', seasons: ALL, formality: 4 },

  { id: 'navy-blazer', kind: 'blazer', color: '#1f2a44', seasons: ['spring', 'autumn', 'winter'], formality: 3 },
  { id: 'camel-coat', kind: 'coat', color: '#c9a87c', seasons: COLD, formality: 3 },
  { id: 'denim-jacket', kind: 'jacket', color: '#5b7ea6', seasons: ['spring', 'autumn'], formality: 2 },
  { id: 'black-puffer', kind: 'jacket', color: '#202020', seasons: ['winter'], formality: 2 },
]

/** Builds the sample wardrobe with names in the visitor's language. */
export function sampleWardrobe(t: Translate): Item[] {
  return SAMPLE_ITEMS.map((sample) => ({
    ...sample,
    id: `sample-${sample.id}`,
    name: t(`sample.${sample.id}` as MessageKey),
    available: true,
    hasPhoto: false,
  }))
}

/** Used when a visitor skips onboarding by loading the sample wardrobe. */
export const SAMPLE_PREFERENCES: Preferences = {
  style: 'classic',
  favoriteColors: ['blue', 'green'],
  occasions: ['everyday', 'office'],
}
