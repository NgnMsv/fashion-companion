import { expect, test, type Page } from '@playwright/test'

// These tests run against the production build, served from the same
// sub-path as on GitHub Pages. Every test starts with empty browser storage.

async function addPiece(page: Page, piece: { name: string; type: string; color: string }) {
  await page.getByRole('button', { name: 'Add piece' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Add a piece' })
  await dialog.getByLabel('Name').fill(piece.name)
  await dialog.getByLabel('Type').selectOption({ label: piece.type })
  // The radio input itself is visually hidden; its pill-shaped label is what users click.
  await dialog.getByText(piece.color, { exact: true }).click()
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toBeHidden()
}

test('core flow: set preferences, add pieces, get an explained outfit', async ({ page }) => {
  await page.goto('./')

  // 1. Preferences
  await page.getByRole('button', { name: 'Set up my style' }).click()
  await page.getByText('Classic', { exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByText('Blue', { exact: true }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Finish' }).click()

  await expect(page.getByRole('heading', { name: 'Your wardrobe is empty' })).toBeVisible()

  // 2. Pieces
  await page.getByRole('link', { name: 'Add pieces' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Wardrobe' })).toBeVisible()
  await addPiece(page, { name: 'Blue tee', type: 'T-shirt', color: 'Blue' })
  await addPiece(page, { name: 'Black trousers', type: 'Trousers', color: 'Black' })
  await addPiece(page, { name: 'White sneakers', type: 'Sneakers', color: 'White' })
  await expect(page.getByText('3 pieces')).toBeVisible()

  // 3. Outfit, with its explanation
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Looks' }).click()
  const look = page.getByRole('article', { name: 'Your colour, grounded' })
  await expect(look).toBeVisible()
  await expect(look.getByText('Blue tee')).toBeVisible()
  await expect(look.getByText('Great match')).toBeVisible()

  await look.getByRole('button', { name: 'Why this outfit?' }).click()
  const why = look.getByRole('region', { name: 'Why this outfit?' })
  await expect(why.getByText('Is one of the colours a favourite of yours?').first()).toBeVisible()
  await expect(why.getByText('On your list of favourite colours: Blue.')).toBeVisible()
  await expect(why.getByText('Score 95 of 100')).toBeVisible()
})

test('the sample wardrobe gives looks within one click and survives a reload', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Try with sample wardrobe' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'Today’s looks' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(3)

  await page.getByRole('button', { name: 'Save look' }).first().click()
  await expect(page.getByRole('button', { name: 'Remove from saved' })).toHaveCount(1)
  await page.reload()

  // Wardrobe, preferences and the saved look all come back from IndexedDB.
  await expect(page.getByRole('article')).toHaveCount(3)
  await expect(page.getByRole('button', { name: 'Remove from saved' })).toHaveCount(1)
})

test('pages open from a direct link and after a refresh', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Try with sample wardrobe' }).click()
  await expect(page.getByRole('article')).toHaveCount(3)

  await page.goto('./wardrobe/')
  await expect(page.getByRole('heading', { level: 1, name: 'Wardrobe' })).toBeVisible()
  await expect(page.getByText('22 pieces')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Wardrobe' })).toBeVisible()

  await page.goto('./about/')
  await expect(page.getByRole('heading', { level: 1, name: 'About this project' })).toBeVisible()
})

test('the wardrobe can be searched and filtered', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Try with sample wardrobe' }).click()
  await expect(page.getByRole('article')).toHaveCount(3)
  await page.goto('./wardrobe/')

  await page.getByLabel('Search by name').fill('sweater')
  await expect(page.getByText('3 of 22 pieces')).toBeVisible()

  await page.getByLabel('Search by name').fill('')
  await page.getByLabel('Category').selectOption({ label: 'Shoes' })
  await page.getByLabel('Dress level').selectOption({ label: 'Formal' })
  await expect(page.getByRole('button', { name: /^Edit / })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Edit Black loafers' })).toBeVisible()
})

test('language and theme can be switched and are remembered', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('./')

  await page.getByRole('button', { name: 'Deutsch' }).click()
  await expect(page.getByRole('button', { name: 'Meinen Stil einrichten' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')

  await page.getByRole('button', { name: 'Zum dunklen Design wechseln' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.reload()
  await expect(page.getByRole('button', { name: 'Meinen Stil einrichten' })).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('the whole flow works with the keyboard alone', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is tested on the desktop layout')
  await page.goto('./')

  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()

  await page.getByRole('button', { name: 'Try with sample wardrobe' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('article')).toHaveCount(3)

  // Radio groups: arrow keys move the selection.
  await page.getByRole('radio', { name: 'Everyday' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'Office' })).toBeChecked()

  const why = page.getByRole('button', { name: 'Why this outfit?' }).first()
  await why.focus()
  await page.keyboard.press('Enter')
  await expect(why).toHaveAttribute('aria-expanded', 'true')

  // The add dialog traps focus and closes with Escape.
  await page.goto('./wardrobe/')
  await page.getByRole('button', { name: 'Add piece' }).focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Add piece' })).toBeFocused()
})

test('no page scrolls sideways', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Try with sample wardrobe' }).click()
  await expect(page.getByRole('article')).toHaveCount(3)
  await page.getByRole('button', { name: 'Why this outfit?' }).first().click()

  for (const path of ['./', './wardrobe/', './style/', './about/']) {
    if (path !== './') await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, path).toBe(0)
  }
})

test('an unknown address shows the not-found page', async ({ page }) => {
  await page.goto('./nope/')
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
})
