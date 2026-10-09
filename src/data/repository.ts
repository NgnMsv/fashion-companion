import type { Item, Preferences } from '../engine/types.ts'

/*
 * THE SERVICE LAYER
 *
 * The rest of the app only knows this interface. Today it is implemented on
 * top of the browser's IndexedDB (indexedDbRepository.ts); a version that
 * calls a real API would implement the same methods and nothing else in the
 * app would have to change. Every method is async for exactly that reason.
 */

/** What the user decided about a suggested outfit. */
export type OutfitMark = 'saved' | 'hidden'

/** Outfit key (see `outfitKey`) -> mark. */
export type OutfitMarks = Record<string, OutfitMark>

export interface WardrobeRepository {
  listItems(): Promise<Item[]>
  /**
   * Creates or updates an item. `photo`: a Blob stores a new photo, `null`
   * removes the stored one, `undefined` leaves it as it is.
   */
  saveItem(item: Item, photo?: Blob | null): Promise<void>
  deleteItem(id: string): Promise<void>
  getPhoto(id: string): Promise<Blob | null>

  getPreferences(): Promise<Preferences | null>
  savePreferences(preferences: Preferences): Promise<void>

  getOutfitMarks(): Promise<OutfitMarks>
  /** `null` removes the mark. */
  setOutfitMark(key: string, mark: OutfitMark | null): Promise<void>

  /** Replaces the whole wardrobe (used by "Try with sample wardrobe"). */
  replaceItems(items: Item[]): Promise<void>
  /** Deletes everything the app has stored. */
  clear(): Promise<void>
}

export function newId(): string {
  return crypto.randomUUID()
}

/** Returns a copy of `marks` with one outfit's mark set or, for `null`, removed. */
export function withMark(marks: OutfitMarks, key: string, mark: OutfitMark | null): OutfitMarks {
  const others = Object.entries(marks).filter(([existing]) => existing !== key)
  return Object.fromEntries(mark ? [...others, [key, mark]] : others)
}
