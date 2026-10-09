import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMemoryRepository } from '../../data/memoryRepository.ts'
import type { Item } from '../../engine/types.ts'
import { englishSample, renderWithProviders } from '../../test/helpers.tsx'
import { WardrobePage } from './WardrobePage.tsx'

function renderPage(items: Item[] = englishSample()) {
  const repository = createMemoryRepository({ items })
  renderWithProviders(<WardrobePage />, repository)
  return repository
}

const pieceButtons = () => screen.getAllByRole('button', { name: /^Edit / })

/** The empty wardrobe shows two "Add piece" buttons; either opens the form. */
async function openAddDialog(user: ReturnType<typeof userEvent.setup>) {
  const [button] = screen.getAllByRole('button', { name: /Add piece/ })
  if (!button) throw new Error('No "Add piece" button found')
  await user.click(button)
}

describe('browsing the wardrobe', () => {
  it('shows all pieces grouped by category', async () => {
    renderPage()

    expect(await screen.findByText('22 pieces')).toBeInTheDocument()
    expect(pieceButtons()).toHaveLength(22)
    for (const category of ['Outerwear', 'Tops', 'Bottoms', 'Shoes']) {
      expect(screen.getByRole('heading', { level: 2, name: new RegExp(category) })).toBeInTheDocument()
    }
  })

  it('searches by name', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Search by name'), 'sweater')

    expect(pieceButtons()).toHaveLength(3)
    expect(screen.getByText('3 of 22 pieces')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: /Shoes/ })).not.toBeInTheDocument()
  })

  it('filters by category, colour, season and dress level together', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(await screen.findByLabelText('Category'), 'Tops')
    expect(pieceButtons()).toHaveLength(8)

    await user.selectOptions(screen.getByLabelText('Season'), 'Summer')
    expect(pieceButtons()).toHaveLength(5)

    await user.selectOptions(screen.getByLabelText('Colour'), 'White')
    expect(pieceButtons()).toHaveLength(2)

    await user.selectOptions(screen.getByLabelText('Dress level'), 'Formal')
    expect(pieceButtons()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Edit White dress shirt' })).toBeInTheDocument()
  })

  it('offers to clear the filters when nothing matches', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Search by name'), 'tuxedo')
    expect(screen.getByRole('heading', { name: 'No piece matches' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(pieceButtons()).toHaveLength(22)
    expect(screen.getByLabelText('Search by name')).toHaveValue('')
  })

  it('shows an empty state with two ways to start', async () => {
    const user = userEvent.setup()
    const repository = renderPage([])

    expect(await screen.findByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load sample wardrobe' }))

    expect(await screen.findByText('22 pieces')).toBeInTheDocument()
    expect(await repository.listItems()).toHaveLength(22)
  })
})

describe('adding a piece', () => {
  it('saves a new piece and shows it in the grid', async () => {
    const user = userEvent.setup()
    const repository = renderPage([])
    await screen.findByRole('heading', { name: 'Nothing here yet' })

    await openAddDialog(user)
    const dialog = within(screen.getByRole('dialog', { name: 'Add a piece' }))
    await user.type(dialog.getByLabelText('Name'), 'Mustard cardigan')
    await user.selectOptions(dialog.getByLabelText('Type'), 'Sweater')
    await user.click(dialog.getByRole('radio', { name: 'Yellow' }))
    await user.click(dialog.getByRole('checkbox', { name: 'Summer' })) // untick
    await user.click(dialog.getByRole('radio', { name: 'Smart' }))
    await user.click(dialog.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('button', { name: 'Edit Mustard cardigan' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await repository.listItems()).toEqual([
      expect.objectContaining({
        name: 'Mustard cardigan',
        kind: 'sweater',
        color: '#e6c229',
        seasons: ['spring', 'autumn', 'winter'],
        formality: 3,
        available: true,
        hasPhoto: false,
      }),
    ])
  })

  it('names the colour as it changes', async () => {
    const user = userEvent.setup()
    renderPage([])
    await screen.findByRole('heading', { name: 'Nothing here yet' })

    await openAddDialog(user)
    expect(screen.getByRole('group', { name: 'Colour: White' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Navy' }))
    expect(screen.getByRole('group', { name: 'Colour: Navy' })).toBeInTheDocument()
  })

  it('asks for a name and at least one season before saving', async () => {
    const user = userEvent.setup()
    const repository = renderPage([])
    await screen.findByRole('heading', { name: 'Nothing here yet' })

    await openAddDialog(user)
    const dialog = within(screen.getByRole('dialog'))
    for (const season of ['Spring', 'Summer', 'Autumn', 'Winter']) {
      await user.click(dialog.getByRole('checkbox', { name: season }))
    }
    await user.click(dialog.getByRole('button', { name: 'Save' }))

    expect(dialog.getByText('Give the piece a name.')).toBeInTheDocument()
    expect(dialog.getByText('Pick at least one season.')).toBeInTheDocument()
    expect(dialog.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
    expect(await repository.listItems()).toHaveLength(0)
  })

  it('closes without saving on Cancel', async () => {
    const user = userEvent.setup()
    const repository = renderPage([])
    await screen.findByRole('heading', { name: 'Nothing here yet' })

    await openAddDialog(user)
    await user.type(screen.getByLabelText('Name'), 'Never mind')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await repository.listItems()).toHaveLength(0)
  })
})

describe('editing a piece', () => {
  it('opens the form with the current values and saves changes', async () => {
    const user = userEvent.setup()
    const repository = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Edit Camel coat' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Edit piece' }))
    const name = dialog.getByLabelText('Name')
    expect(name).toHaveValue('Camel coat')
    expect(dialog.getByLabelText('Type')).toHaveValue('coat')

    await user.clear(name)
    await user.type(name, 'Wool coat')
    await user.click(dialog.getByRole('checkbox', { name: 'Available to wear' }))
    await user.click(dialog.getByRole('button', { name: 'Save' }))

    const card = await screen.findByRole('button', { name: 'Edit Wool coat' })
    expect(within(card).getByText('Not available')).toBeInTheDocument()
    const stored = (await repository.listItems()).find((item) => item.name === 'Wool coat')
    expect(stored).toMatchObject({ id: 'sample-camel-coat', available: false })
  })

  it('deletes a piece only after confirmation', async () => {
    const user = userEvent.setup()
    const repository = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Edit Olive shorts' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(await repository.listItems()).toHaveLength(22)

    await user.click(screen.getByRole('button', { name: 'Yes, delete' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Edit Olive shorts' })).not.toBeInTheDocument(),
    )
    expect(await repository.listItems()).toHaveLength(21)
    expect(screen.getByText('21 pieces')).toBeInTheDocument()
  })
})
