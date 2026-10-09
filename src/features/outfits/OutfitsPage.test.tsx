import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMemoryRepository } from '../../data/memoryRepository.ts'
import { SAMPLE_PREFERENCES } from '../../data/sample.ts'
import type { Item, Preferences } from '../../engine/types.ts'
import { classic, COLORS, englishSample, makeItem, renderWithProviders } from '../../test/helpers.tsx'
import { OutfitsPage } from './OutfitsPage.tsx'

const AUTUMN = new Date('2026-10-09T12:00:00')

function renderPage(items: Item[], preferences: Preferences = classic) {
  const repository = createMemoryRepository({ items, preferences })
  renderWithProviders(<OutfitsPage preferences={preferences} today={AUTUMN} />, repository)
  return repository
}

const blueTee = makeItem('tshirt', COLORS.blue, { name: 'Blue tee' })
const blackTrousers = makeItem('trousers', COLORS.black, { name: 'Black trousers' })
const whiteSneakers = makeItem('sneakers', COLORS.white, { name: 'White sneakers' })
const oneOutfit = [blueTee, blackTrousers, whiteSneakers]

describe('outfit cards', () => {
  it('shows three looks from the sample wardrobe, with the season taken from the date', async () => {
    renderPage(englishSample(), SAMPLE_PREFERENCES)

    expect(await screen.findAllByRole('article')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Autumn' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Everyday' })).toBeChecked()
    expect(screen.getByText(/3 looks, chosen from \d+ possible combinations/)).toBeInTheDocument()
  })

  it('shows the pieces, the verdict and the reason on a card', async () => {
    renderPage(oneOutfit, { ...classic, favoriteColors: ['blue'] })

    const card = within(await screen.findByRole('article', { name: 'Your colour, grounded' }))
    expect(card.getByText('Look 01')).toBeInTheDocument()
    expect(card.getByText('Great match')).toBeInTheDocument()
    expect(card.getByText('Blue tee')).toBeInTheDocument()
    expect(card.getByText('Black trousers')).toBeInTheDocument()
    expect(card.getByText('White sneakers')).toBeInTheDocument()
    expect(card.getByText(/One favourite colour with neutrals around it/)).toBeInTheDocument()
  })

  it('updates the looks when the occasion changes', async () => {
    const user = userEvent.setup()
    renderPage(oneOutfit)
    await screen.findByRole('article')

    await user.click(screen.getByRole('radio', { name: 'Workout' }))

    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No look passes the rules' })).toBeInTheDocument()
    expect(screen.getByText('1 × Wrong for the occasion')).toBeInTheDocument()
  })
})

describe('"Why this outfit?" panel', () => {
  it('lists every question the tree asked, with its answer and the verdict', async () => {
    const user = userEvent.setup()
    renderPage(oneOutfit, { ...classic, favoriteColors: ['blue'] })

    const toggle = await screen.findByRole('button', { name: 'Why this outfit?' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    const panel = within(screen.getByRole('region', { name: 'Why this outfit?' }))
    expect(panel.getByText('The decision tree asked 6 questions to reach this verdict.')).toBeInTheDocument()

    const steps = panel.getAllByRole('listitem').slice(0, 7).map((step) => step.textContent)
    expect(steps[0]).toContain('Does every piece suit Everyday? Yes')
    expect(steps[1]).toContain('Can every piece be worn in Autumn? Yes')
    expect(steps[3]).toContain('Is there more than one colour, neutrals aside? No')
    expect(steps[4]).toContain('One colour: Blue.')
    expect(steps[5]).toContain('On your list of favourite colours: Blue.')
    expect(steps[6]).toContain('Result · Great match')
    expect(steps[6]).toContain('Score 95 of 100')
  })

  it('explains with the names of the pieces involved', async () => {
    const user = userEvent.setup()
    renderPage(oneOutfit)

    await user.click(await screen.findByRole('button', { name: 'Why this outfit?' }))

    expect(
      screen.getByText(/From “.+” to “.+”, nothing is more than one dress level apart\./),
    ).toBeInTheDocument()
  })

  it('offers the whole tree with the taken path marked', async () => {
    const user = userEvent.setup()
    renderPage(oneOutfit)

    await user.click(await screen.findByRole('button', { name: 'Why this outfit?' }))
    await user.click(screen.getByText('See the whole decision tree'))

    expect(screen.getByText('Good match: One colour, kept simple')).toHaveTextContent('(path taken)')
    expect(screen.getByText('Rejected: Colours clash')).not.toHaveTextContent('(path taken)')
  })

  it('closes again', async () => {
    const user = userEvent.setup()
    renderPage(oneOutfit)

    const toggle = await screen.findByRole('button', { name: 'Why this outfit?' })
    await user.click(toggle)
    await user.click(toggle)

    expect(screen.queryByRole('region', { name: 'Why this outfit?' })).not.toBeInTheDocument()
  })
})

describe('saving and removing looks', () => {
  it('saves a look and lists it under "Saved looks"', async () => {
    const user = userEvent.setup()
    const repository = renderPage(oneOutfit)

    expect(await screen.findByText('Looks you save appear here.')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Save look' }))

    expect(await screen.findByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true')
    const saved = within(screen.getByRole('region', { name: 'Saved looks' }))
    expect(saved.getByText('Blue tee, Black trousers, and White sneakers')).toBeInTheDocument()
    expect(Object.values(await repository.getOutfitMarks())).toEqual(['saved'])

    await user.click(saved.getByRole('button', { name: 'Remove from saved' }))
    expect(await screen.findByText('Looks you save appear here.')).toBeInTheDocument()
  })

  it('removes a look with "Not for me" and brings it back with Undo', async () => {
    const user = userEvent.setup()
    renderPage(oneOutfit)

    await user.click(await screen.findByRole('button', { name: 'Not for me' }))

    await waitFor(() => expect(screen.queryByRole('article')).not.toBeInTheDocument())
    expect(screen.getByText(/1 more were removed by you/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(await screen.findByRole('article')).toBeInTheDocument()
  })

  it('brings back all removed looks from the empty state', async () => {
    const user = userEvent.setup()
    renderPage(oneOutfit)

    await user.click(await screen.findByRole('button', { name: 'Not for me' }))
    await user.click(await screen.findByRole('button', { name: 'Bring back removed looks' }))

    expect(await screen.findByRole('article')).toBeInTheDocument()
  })
})

describe('empty states', () => {
  it('invites the user to add pieces when the wardrobe is empty', async () => {
    renderPage([])

    expect(
      await screen.findByRole('heading', { name: 'Your wardrobe is empty' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add pieces' })).toHaveAttribute(
      'href',
      `${import.meta.env.BASE_URL}wardrobe/`,
    )
    expect(screen.getByRole('button', { name: /Shuffle/ })).toBeDisabled()
  })

  it('names the categories that are still missing', async () => {
    renderPage([blueTee])

    expect(await screen.findByRole('heading', { name: 'Almost there' })).toBeInTheDocument()
    expect(screen.getByText(/Still missing: a bottom and shoes\./)).toBeInTheDocument()
  })
})
