import type { Item, Preferences } from '../engine/types.ts'
import { withMark, type OutfitMarks, type WardrobeRepository } from './repository.ts'

/*
 * IndexedDB implementation of the repository.
 *
 * Why IndexedDB and not localStorage: users can add photos. localStorage
 * only stores strings, is limited to about 5 MB, and blocks the page while
 * reading. IndexedDB stores image Blobs directly, has a far larger quota,
 * and is asynchronous.
 *
 * The IndexedDB API is callback-based; `request()` and `done()` below turn
 * it into promises. That is all the "library" this needs.
 */

const DB_NAME = 'fashion-companion'
const DB_VERSION = 1
const ITEMS = 'items'
const PHOTOS = 'photos'
const SETTINGS = 'settings'
const PREFERENCES_KEY = 'preferences'
const MARKS_KEY = 'outfit-marks'

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'))
  })
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB write aborted'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  const open = indexedDB.open(DB_NAME, DB_VERSION)
  open.onupgradeneeded = () => {
    const db = open.result
    if (!db.objectStoreNames.contains(ITEMS)) db.createObjectStore(ITEMS, { keyPath: 'id' })
    if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS)
    if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS)
  }
  return request(open)
}

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

export function createIndexedDbRepository(): WardrobeRepository {
  // Opened once, on first use, and shared by all later calls.
  let database: Promise<IDBDatabase> | undefined
  const db = () => (database ??= openDatabase())

  async function read<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
    const transaction = (await db()).transaction(store, 'readonly')
    return request(transaction.objectStore(store).get(key) as IDBRequest<T | undefined>)
  }

  async function write(
    stores: string[],
    run: (store: (name: string) => IDBObjectStore) => void,
  ): Promise<void> {
    const transaction = (await db()).transaction(stores, 'readwrite')
    run((name) => transaction.objectStore(name))
    await done(transaction)
  }

  return {
    async listItems() {
      const transaction = (await db()).transaction(ITEMS, 'readonly')
      return request(transaction.objectStore(ITEMS).getAll() as IDBRequest<Item[]>)
    },

    async saveItem(item, photo) {
      const hasPhoto = photo ? true : photo === null ? false : item.hasPhoto
      await write([ITEMS, PHOTOS], (store) => {
        store(ITEMS).put({ ...item, hasPhoto })
        if (photo) store(PHOTOS).put(photo, item.id)
        if (photo === null) store(PHOTOS).delete(item.id)
      })
    },

    async deleteItem(id) {
      await write([ITEMS, PHOTOS], (store) => {
        store(ITEMS).delete(id)
        store(PHOTOS).delete(id)
      })
    },

    async getPhoto(id) {
      return (await read<Blob>(PHOTOS, id)) ?? null
    },

    async getPreferences() {
      return (await read<Preferences>(SETTINGS, PREFERENCES_KEY)) ?? null
    },

    async savePreferences(preferences) {
      await write([SETTINGS], (store) => store(SETTINGS).put(preferences, PREFERENCES_KEY))
    },

    async getOutfitMarks() {
      return (await read<OutfitMarks>(SETTINGS, MARKS_KEY)) ?? {}
    },

    async setOutfitMark(key, mark) {
      const marks = withMark((await read<OutfitMarks>(SETTINGS, MARKS_KEY)) ?? {}, key, mark)
      await write([SETTINGS], (store) => store(SETTINGS).put(marks, MARKS_KEY))
    },

    async replaceItems(items) {
      await write([ITEMS, PHOTOS, SETTINGS], (store) => {
        store(ITEMS).clear()
        store(PHOTOS).clear()
        store(SETTINGS).delete(MARKS_KEY)
        for (const item of items) store(ITEMS).put({ ...item, hasPhoto: false })
      })
    },

    async clear() {
      await write([ITEMS, PHOTOS, SETTINGS], (store) => {
        store(ITEMS).clear()
        store(PHOTOS).clear()
        store(SETTINGS).clear()
      })
    },
  }
}
