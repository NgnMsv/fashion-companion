import { describe, expect, it } from 'vitest'
import { matchRoute, stripBase, toHref } from './router.tsx'

describe('stripBase', () => {
  it.each([
    ['/fashion-companion/', '/'],
    ['/fashion-companion', '/'],
    ['/fashion-companion/index.html', '/'],
    ['/fashion-companion/wardrobe/', '/wardrobe/'],
    ['/fashion-companion/wardrobe', '/wardrobe/'],
    ['/fashion-companion/wardrobe/index.html', '/wardrobe/'],
  ])('turns %s into %s', (pathname, expected) => {
    expect(stripBase(pathname, '/fashion-companion')).toBe(expected)
  })

  it('works without a base', () => {
    expect(stripBase('/about', '')).toBe('/about/')
    expect(stripBase('/', '')).toBe('/')
  })
})

describe('matchRoute', () => {
  it('finds the page for a path', () => {
    expect(matchRoute('/')).toBe('outfits')
    expect(matchRoute('/wardrobe/')).toBe('wardrobe')
    expect(matchRoute('/style/')).toBe('style')
    expect(matchRoute('/about/')).toBe('about')
  })

  it('returns not-found for anything else', () => {
    expect(matchRoute('/nope/')).toBe('not-found')
    expect(matchRoute('/wardrobe/extra/')).toBe('not-found')
  })
})

describe('toHref', () => {
  it('prefixes paths with the base the app is served from', () => {
    expect(toHref('/wardrobe/')).toBe(`${import.meta.env.BASE_URL}wardrobe/`)
  })
})
