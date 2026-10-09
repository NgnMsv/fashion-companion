import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMemoryRepository } from './data/memoryRepository.ts'
import { classic, englishSample, renderApp } from './test/helpers.tsx'

describe('first visit', () => {
  it('shows the welcome screen and hides the navigation', async () => {
    renderApp()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Get dressed with a second opinion.' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('walks through the three style questions and saves the answers', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Set up my style' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Step 1 of 3' })).toHaveFocus()
    await user.click(screen.getByRole('radio', { name: /Bold/ }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Step 2 of 3' })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Blue' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await user.click(screen.getByRole('checkbox', { name: 'Office' }))
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Today’s looks' }),
    ).toBeInTheDocument()
    expect(await repository.getPreferences()).toEqual({
      style: 'bold',
      favoriteColors: ['blue'],
      occasions: ['everyday', 'office'],
    })
    expect(screen.getAllByRole('navigation', { name: 'Main' }).length).toBeGreaterThan(0)
  })

  it('goes back a step, and from the first step back to the welcome screen', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(await screen.findByRole('button', { name: 'Set up my style' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Step 1 of 3' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('button', { name: 'Set up my style' })).toBeInTheDocument()
  })

  it('does not finish without an occasion', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Set up my style' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('checkbox', { name: 'Everyday' })) // untick the default
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Pick at least one occasion.')
    expect(await repository.getPreferences()).toBeNull()
  })

  it('loads the sample wardrobe and shows looks straight away', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Try with sample wardrobe' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Today’s looks' }),
    ).toBeInTheDocument()
    expect(await screen.findAllByRole('article')).toHaveLength(3)
    expect(await repository.listItems()).toHaveLength(22)
  })
})

describe('navigation and settings', () => {
  const seeded = () => createMemoryRepository({ items: englishSample(), preferences: classic })

  it('moves between pages and focuses the new page heading', async () => {
    const user = userEvent.setup()
    renderApp({ repository: seeded() })
    await screen.findByRole('heading', { level: 1, name: 'Today’s looks' })

    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]
    if (!nav) throw new Error('No navigation found')
    await user.click(within(nav).getByRole('link', { name: 'Wardrobe' }))

    const heading = await screen.findByRole('heading', { level: 1, name: 'Wardrobe' })
    expect(heading).toHaveFocus()
    expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}wardrobe/`)
    expect(within(nav).getByRole('link', { name: 'Wardrobe' })).toHaveAttribute('aria-current', 'page')
  })

  it('opens a page directly from its address', async () => {
    renderApp({ repository: seeded(), path: '/about/' })

    expect(
      await screen.findByRole('heading', { level: 1, name: 'About this project' }),
    ).toBeInTheDocument()
  })

  it('switches to German and remembers it', async () => {
    const user = userEvent.setup()
    renderApp({ repository: seeded() })
    await screen.findByRole('heading', { level: 1, name: 'Today’s looks' })

    await user.click(screen.getByRole('button', { name: /Deutsch/ }))

    expect(screen.getByRole('heading', { level: 1, name: 'Looks für heute' })).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('lang', 'de')
    expect(window.localStorage.getItem('fc-language')).toBe('de')
    expect(screen.getByRole('button', { name: /Deutsch/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('switches between light and dark theme', async () => {
    const user = userEvent.setup()
    renderApp({ repository: seeded() })

    await user.click(await screen.findByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement).toHaveClass('dark')
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('saves changes made on the My style page', async () => {
    const user = userEvent.setup()
    const { repository } = renderApp({ repository: seeded(), path: '/style/' })

    await user.click(await screen.findByRole('radio', { name: /Minimal/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Green' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Style saved.')).toBeInTheDocument()
    expect(await repository.getPreferences()).toEqual({
      style: 'minimal',
      favoriteColors: ['green'],
      occasions: ['everyday'],
    })
  })
})

describe('About page', () => {
  it('says when the project was built and links to both original repositories', async () => {
    renderApp({ path: '/about/' })

    expect(await screen.findByText(/first built in 2024/)).toHaveTextContent(
      /redesigned and rebuilt from scratch/,
    )
    expect(screen.getByRole('link', { name: /Smart-Closet-Frontend/ })).toHaveAttribute(
      'href',
      'https://github.com/NgnMsv/Smart-Closet-Frontend',
    )
    expect(screen.getByRole('link', { name: /Smart-Closet-Backend/ })).toHaveAttribute(
      'href',
      'https://github.com/NgnMsv/Smart-Closet-Backend',
    )
  })

  it('shows the whole decision tree', async () => {
    renderApp({ path: '/about/' })

    expect(await screen.findByText('Does every piece suit …?')).toBeInTheDocument()
    expect(screen.getByText('Rejected: Colours clash')).toBeInTheDocument()
  })

  it('deletes all data after confirmation', async () => {
    const user = userEvent.setup()
    const repository = createMemoryRepository({ items: englishSample(), preferences: classic })
    renderApp({ repository, path: '/about/' })

    await user.click(await screen.findByRole('button', { name: 'Delete all my data' }))
    expect(await repository.listItems()).toHaveLength(22) // nothing happens before confirming
    await user.click(screen.getByRole('button', { name: 'Yes, delete everything' }))

    await waitFor(async () => expect(await repository.listItems()).toHaveLength(0))
    expect(await repository.getPreferences()).toBeNull()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Get dressed with a second opinion.' }),
    ).toBeInTheDocument()
  })
})
