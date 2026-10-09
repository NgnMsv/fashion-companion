import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react'

/*
 * A small client-side router on top of the History API. The app has four
 * pages, so a routing library would add more code than it saves.
 *
 * The app is served from a sub-folder (https://ngnmsv.github.io/fashion-companion/),
 * so every path is relative to Vite's `base`. Pages are written without it
 * ("/wardrobe/"); `toHref` adds it and `usePath` removes it.
 */

export const ROUTES = {
  outfits: '/',
  wardrobe: '/wardrobe/',
  style: '/style/',
  about: '/about/',
} as const
export type RouteName = keyof typeof ROUTES
export type RoutePath = (typeof ROUTES)[RouteName]

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') // "/fashion-companion" or ""
const NAVIGATE_EVENT = 'app:navigate'

export function toHref(path: RoutePath): string {
  return `${BASE}${path}`
}

/** "/fashion-companion/wardrobe/index.html" -> "/wardrobe/" */
export function stripBase(pathname: string, base: string = BASE): string {
  const withoutBase = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname
  const clean = withoutBase.replace(/index\.html$/, '').replace(/\/+$/, '')
  return clean === '' ? '/' : `${clean}/`
}

export function matchRoute(path: string): RouteName | 'not-found' {
  const names = Object.keys(ROUTES) as RouteName[]
  return names.find((name) => ROUTES[name] === path) ?? 'not-found'
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange)
  window.addEventListener(NAVIGATE_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(NAVIGATE_EVENT, onChange)
  }
}

/** The current page, relative to the base. Re-renders when it changes. */
export function usePath(): string {
  return useSyncExternalStore(subscribe, () => stripBase(window.location.pathname))
}

export function navigate(path: RoutePath): void {
  if (stripBase(window.location.pathname) !== path) {
    window.history.pushState(null, '', toHref(path))
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT))
  window.scrollTo({ top: 0, behavior: 'instant' })
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: RoutePath
}

/** An internal link: a real <a href>, upgraded to a client-side navigation. */
export function Link({ to, onClick, ...rest }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    const isPlainLeftClick =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
    if (event.defaultPrevented || !isPlainLeftClick) return
    event.preventDefault()
    navigate(to)
  }

  return <a href={toHref(to)} onClick={handleClick} {...rest} />
}
