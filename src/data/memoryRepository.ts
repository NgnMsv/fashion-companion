import type { Item, Preferences } from '../engine/types.ts'
import { withMark, type OutfitMark, type OutfitMarks, type WardrobeRepository } from './repository.ts'

interface Seed {
  items?: Item[]
  preferences?: Preferences | null
  marks?: OutfitMarks
}

/**
 * Keeps everything in memory. Used by the component tests, and as a fallback
 * when the browser does not allow IndexedDB (data then lasts until reload).
 */
export function createMemoryRepository(seed: Seed = {}): WardrobeRepository {
  let items = new Map((seed.items ?? []).map((item) => [item.id, item]))
  const photos = new Map<string, Blob>()
  let preferences = seed.preferences ?? null
  let marks: OutfitMarks = { ...seed.marks }

  return {
    async listItems() {
      return [...items.values()]
    },
    async saveItem(item, photo) {
      if (photo) photos.set(item.id, photo)
      if (photo === null) photos.delete(item.id)
      items.set(item.id, { ...item, hasPhoto: photos.has(item.id) })
    },
    async deleteItem(id) {
      items.delete(id)
      photos.delete(id)
    },
    async getPhoto(id) {
      return photos.get(id) ?? null
    },
    async getPreferences() {
      return preferences
    },
    async savePreferences(next) {
      preferences = next
    },
    async getOutfitMarks() {
      return { ...marks }
    },
    async setOutfitMark(key: string, mark: OutfitMark | null) {
      marks = withMark(marks, key, mark)
    },
    async replaceItems(next) {
      items = new Map(next.map((item) => [item.id, { ...item, hasPhoto: false }]))
      photos.clear()
      marks = {}
    },
    async clear() {
      items.clear()
      photos.clear()
      preferences = null
      marks = {}
    },
  }
}
