import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { createIndexedDbRepository, isIndexedDbAvailable } from './data/indexedDbRepository.ts'
import { createMemoryRepository } from './data/memoryRepository.ts'
import { RepositoryProvider } from './data/queries.tsx'
import { I18nProvider, useI18n } from './i18n/index.tsx'
import './index.css'

// The data lives on this device, so it never goes stale by itself: cached
// results stay valid until one of our own writes invalidates them.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, retry: false, refetchOnWindowFocus: false },
  },
})

// Some browsers block IndexedDB (certain private modes). The app still works,
// but only in memory, and says so.
const persistent = isIndexedDbAvailable()
const repository = persistent ? createIndexedDbRepository() : createMemoryRepository()

function StorageWarning() {
  const { t } = useI18n()
  return (
    <p role="status" className="bg-fg px-4 py-2 text-center text-sm text-bg">
      {t('storage.temporary')}
    </p>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('index.html is missing the #root element')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RepositoryProvider repository={repository}>
        <I18nProvider>
          <App banner={persistent ? undefined : <StorageWarning />} />
        </I18nProvider>
      </RepositoryProvider>
    </QueryClientProvider>
  </StrictMode>,
)
