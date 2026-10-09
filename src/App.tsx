import { useEffect, useRef, type ReactNode } from 'react'
import { usePreferences } from './data/queries.tsx'
import { AboutPage } from './features/about/AboutPage.tsx'
import { Welcome } from './features/onboarding/Welcome.tsx'
import { OutfitsPage } from './features/outfits/OutfitsPage.tsx'
import { Shell } from './features/shell/Shell.tsx'
import { StylePage } from './features/style/StylePage.tsx'
import { WardrobePage } from './features/wardrobe/WardrobePage.tsx'
import { useI18n } from './i18n/index.tsx'
import { Link, matchRoute, ROUTES, usePath } from './lib/router.tsx'
import { buttonClass, EmptyState, ErrorState, Skeleton } from './ui/controls.tsx'

interface AppProps {
  /** Shown above the page, e.g. a warning that storage is unavailable. */
  banner?: ReactNode
}

export function App({ banner }: AppProps) {
  const { t } = useI18n()
  const path = usePath()
  const route = matchRoute(path)
  const preferences = usePreferences()

  // After a page change, move focus to the new page's heading so keyboard
  // and screen-reader users know the page changed.
  const previousPath = useRef(path)
  useEffect(() => {
    if (previousPath.current === path) return
    previousPath.current = path
    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true })
  }, [path])

  // Until the visitor has answered the style questions (or loaded the sample
  // wardrobe), every page except "About" shows the welcome screen.
  const onboarded = preferences.data != null

  let page: ReactNode
  if (route === 'not-found') {
    page = (
      <EmptyState
        title="404"
        action={
          <Link to={ROUTES.outfits} className={buttonClass.primary}>
            {t('app.name')}
          </Link>
        }
      />
    )
  } else if (route === 'about') {
    page = <AboutPage preferences={preferences.data ?? null} />
  } else if (preferences.isPending) {
    page = (
      <div className="space-y-6">
        <Skeleton count={1} className="h-16 max-w-md" />
        <Skeleton count={2} className="h-72" />
      </div>
    )
  } else if (preferences.isError) {
    page = <ErrorState onRetry={() => void preferences.refetch()} />
  } else if (!preferences.data) {
    page = <Welcome />
  } else if (route === 'wardrobe') {
    page = <WardrobePage />
  } else if (route === 'style') {
    page = <StylePage preferences={preferences.data} />
  } else {
    page = <OutfitsPage preferences={preferences.data} />
  }

  return (
    <Shell current={route} showNav={onboarded} banner={banner}>
      {page}
    </Shell>
  )
}
