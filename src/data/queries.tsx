import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import type { Item, Preferences } from '../engine/types.ts'
import type { OutfitMark, WardrobeRepository } from './repository.ts'

/*
 * React hooks over the repository, built with TanStack Query.
 *
 * Why TanStack Query for local data: the repository is asynchronous (like an
 * API), several screens read the same data, and every write must refresh
 * what the other screens show. Query gives us caching, loading and error
 * states, and "invalidate after a write" without hand-written state code.
 * If the repository is later replaced by a real API, these hooks stay as
 * they are.
 */

const RepositoryContext = createContext<WardrobeRepository | null>(null)

export function RepositoryProvider({
  repository,
  children,
}: {
  repository: WardrobeRepository
  children: ReactNode
}) {
  return <RepositoryContext value={repository}>{children}</RepositoryContext>
}

export function useRepository(): WardrobeRepository {
  const repository = useContext(RepositoryContext)
  if (!repository) throw new Error('useRepository must be used inside <RepositoryProvider>')
  return repository
}

export const keys = {
  items: ['items'],
  preferences: ['preferences'],
  marks: ['outfit-marks'],
  photo: (id: string) => ['photo', id],
} as const

export function useItems() {
  const repository = useRepository()
  return useQuery({ queryKey: keys.items, queryFn: () => repository.listItems() })
}

export function usePreferences() {
  const repository = useRepository()
  return useQuery({ queryKey: keys.preferences, queryFn: () => repository.getPreferences() })
}

export function useOutfitMarks() {
  const repository = useRepository()
  return useQuery({ queryKey: keys.marks, queryFn: () => repository.getOutfitMarks() })
}

/** An object URL for an item's photo, or null. Revoked when no longer shown. */
export function usePhotoUrl(item: Pick<Item, 'id' | 'hasPhoto'>): string | null {
  const repository = useRepository()
  const { data: blob } = useQuery({
    queryKey: keys.photo(item.id),
    queryFn: () => repository.getPhoto(item.id),
    enabled: item.hasPhoto,
  })
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])
  return item.hasPhoto ? url : null
}

export function useSaveItem() {
  const repository = useRepository()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ item, photo }: { item: Item; photo?: Blob | null }) =>
      repository.saveItem(item, photo),
    onSuccess: (_result, { item }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: keys.items }),
        client.invalidateQueries({ queryKey: keys.photo(item.id) }),
      ]),
  })
}

export function useDeleteItem() {
  const repository = useRepository()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.deleteItem(id),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.items }),
  })
}

export function useSavePreferences() {
  const repository = useRepository()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (preferences: Preferences) => repository.savePreferences(preferences),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.preferences }),
  })
}

export function useSetOutfitMark() {
  const repository = useRepository()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ key, mark }: { key: string; mark: OutfitMark | null }) =>
      repository.setOutfitMark(key, mark),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.marks }),
  })
}

/** Replaces the wardrobe with sample pieces and, if given, sets preferences. */
export function useLoadSample() {
  const repository = useRepository()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ items, preferences }: { items: Item[]; preferences?: Preferences }) => {
      await repository.replaceItems(items)
      if (preferences) await repository.savePreferences(preferences)
    },
    onSuccess: () => client.invalidateQueries(),
  })
}

export function useClearAll() {
  const repository = useRepository()
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => repository.clear(),
    onSuccess: () => client.invalidateQueries(),
  })
}
