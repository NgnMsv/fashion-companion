import type { ReactNode } from 'react'
import { LANGUAGES, useI18n, type MessageKey } from '../../i18n/index.tsx'
import { Link, ROUTES, type RouteName } from '../../lib/router.tsx'
import { useTheme } from '../../lib/theme.ts'

const NAV: { route: RouteName; label: MessageKey; icon: string }[] = [
  // Icons are simple line drawings: hanger, grid, sliders, info.
  { route: 'outfits', label: 'nav.outfits', icon: 'M12 7a2 2 0 1 1 2 2c-1 0-2 .6-2 2v1l9 5.5a1 1 0 0 1-.5 1.9h-17a1 1 0 0 1-.5-1.9L12 12' },
  { route: 'wardrobe', label: 'nav.wardrobe', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
  { route: 'style', label: 'nav.style', icon: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4' },
  { route: 'about', label: 'nav.about', icon: 'M12 11v6M12 7.5v.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
]

function Icon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  )
}

function ThemeToggle() {
  const { t } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const label = t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-fg/10"
    >
      <Icon
        path={
          theme === 'dark'
            ? 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'
            : 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z'
        }
      />
    </button>
  )
}

function LanguageSwitch() {
  const { t, language, setLanguage } = useI18n()
  return (
    <div role="group" aria-label={t('language.label')} className="flex rounded-full border border-fg/30 p-0.5">
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={language === code}
          onClick={() => setLanguage(code)}
          className="min-h-10 min-w-10 cursor-pointer rounded-full px-2 text-xs font-semibold tracking-wider uppercase aria-pressed:bg-fg aria-pressed:text-bg"
        >
          {code}
          {/* The accessible name starts with the visible text, then spells it out. */}
          <span className="sr-only"> – {t(`language.${code}`)}</span>
        </button>
      ))}
    </div>
  )
}

interface ShellProps {
  /** The page being shown; null hides the navigation (during onboarding). */
  current: RouteName | 'not-found'
  showNav: boolean
  banner?: ReactNode
  children: ReactNode
}

/** The frame around every page: header, navigation, and the main area. */
export function Shell({ current, showNav, banner, children }: ShellProps) {
  const { t } = useI18n()

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-30 focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
      >
        {t('app.skip')}
      </a>

      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to={ROUTES.outfits} className="font-display text-xl font-semibold tracking-tight">
            {t('app.name')}
          </Link>

          {showNav && (
            <nav aria-label={t('nav.label')} className="hidden md:block">
              <ul className="flex gap-1">
                {NAV.map((item) => (
                  <li key={item.route}>
                    <Link
                      to={ROUTES[item.route]}
                      aria-current={current === item.route ? 'page' : undefined}
                      className="flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-muted transition-colors hover:text-fg aria-[current]:bg-fg aria-[current]:text-bg"
                    >
                      {t(item.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="flex items-center gap-1">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {banner}

      <main id="main" className="mx-auto max-w-6xl px-4 pt-8 pb-28 sm:px-6 md:pt-12 md:pb-20">
        {children}
      </main>

      {/* On phones the navigation is a tab bar within thumb reach. */}
      {showNav && (
        <nav
          aria-label={t('nav.label')}
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          <ul className="mx-auto grid max-w-md grid-cols-4">
            {NAV.map((item) => (
              <li key={item.route}>
                <Link
                  to={ROUTES[item.route]}
                  aria-current={current === item.route ? 'page' : undefined}
                  className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium text-muted aria-[current]:text-fg"
                >
                  <Icon path={item.icon} />
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  )
}
