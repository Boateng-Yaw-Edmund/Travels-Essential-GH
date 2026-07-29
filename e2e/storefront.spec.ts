import { expect, test } from '@playwright/test'

test('customer can filter a category and add an item to the mock cart', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Pack better. Go further.' })).toBeVisible()

  const category = page.getByRole('button', { name: 'Packing Cubes A place for everything' })
  await category.click()
  await expect(page.getByTestId('product-card')).toHaveCount(1)

  await page.getByRole('button', { name: 'Add 9-Piece Packing Cube Set to cart' }).click()
  await expect(page.getByRole('button', { name: 'Adding 9-Piece Packing Cube Set to cart' })).toBeDisabled()
  await page.getByRole('searchbox', { name: 'Search products' }).fill('passport')
  await page.getByRole('searchbox', { name: 'Search products' }).fill('')
  await expect(page.getByRole('button', { name: 'Adding 9-Piece Packing Cube Set to cart' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Cart with 1 item' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('9-Piece Packing Cube Set added to your cart')
})

test('mobile navigation works without horizontal page overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-specific layout check')
  await page.goto('/')

  await page.getByRole('button', { name: 'Open navigation' }).click()
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport)
})

test('customer can choose a suitcase colour before adding it to the cart', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox', { name: 'Search products' }).fill('suitcase')

  const suitcase = page.getByTestId('product-card')
  await suitcase.getByRole('button', { name: 'Select Pink' }).click()
  await expect(suitcase.getByText('Colour: Pink')).toBeVisible()
  await expect(suitcase.getByRole('img', { name: 'Cabin Suitcase in Pink product photograph' })).toBeVisible()

  await suitcase.getByRole('button', { name: 'Add Cabin Suitcase in Pink to cart' }).click()
  await expect(page.getByRole('status')).toContainText('Cabin Suitcase in Pink added to your cart')
})
