import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { App } from '../App.tsx'
import { createMemoryRepository } from '../data/memoryRepository.ts'
import { RepositoryProvider } from '../data/queries.tsx'
import type { WardrobeRepository } from '../data/repository.ts'
import { sampleWardrobe } from '../data/sample.ts'
import type { Formality, Item, Kind, Preferences, Season } from '../engine/types.ts'
import { I18nProvider, translate } from '../i18n/index.tsx'
import { toHref, type RoutePath } from '../lib/router.tsx'

export const ALL_SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

export const COLORS = {
  white: '#f7f5f0',
  black: '#141414',
  blue: '#3f6fb5',
  green: '#2f6b4f',
  red: '#c0392b',
  orange: '#d9722b',
} as const

let counter = 0

/** Builds an item for a test; everything not given gets a sensible default. */
export function makeItem(kind: Kind, color: string, overrides: Partial<Item> = {}): Item {
  counter += 1
  const formality: Formality = 2
  return {
    id: `${kind}-${counter}`,
    name: `${kind} ${counter}`,
    kind,
    color,
    seasons: ALL_SEASONS,
    formality,
    available: true,
    hasPhoto: false,
    ...overrides,
  }
}

export const classic: Preferences = {
  style: 'classic',
  favoriteColors: [],
  occasions: ['everyday'],
}

/** The sample wardrobe with English names. */
export function englishSample(): Item[] {
  return sampleWardrobe((key, params) => translate('en', key, params))
}

/** Renders something inside the providers the app needs. */
export function renderWithProviders(ui: ReactElement, repository: WardrobeRepository) {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <RepositoryProvider repository={repository}>
        <I18nProvider initial="en">{ui}</I18nProvider>
      </RepositoryProvider>
    </QueryClientProvider>,
  )
}

interface RenderAppOptions {
  repository?: WardrobeRepository
  path?: RoutePath
}

/** Renders the whole app on a given page with an in-memory repository. */
export function renderApp({ repository, path = '/' }: RenderAppOptions = {}) {
  const repo = repository ?? createMemoryRepository()
  window.history.replaceState(null, '', toHref(path))
  return { repository: repo, ...renderWithProviders(<App />, repo) }
}
