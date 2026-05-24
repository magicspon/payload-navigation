import { expect, test } from '@playwright/test'
import type { APIRequestContext, Locator, Page } from '@playwright/test'

const BASE = 'http://localhost:3000'
const CREDENTIALS = { email: 'dev@payloadcms.com', password: 'test' }

function getDrawer(page: Page) {
  return page.locator('dialog[open]').last()
}

async function selectOption(control: Locator, page: Page, optionText: string) {
  await control.waitFor({ state: 'visible' })
  await control.click()
  await page.locator('.rs__option', { hasText: optionText }).first().click()
}

async function login(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BASE}/api/users/login`, { data: CREDENTIALS })
  const { token } = await res.json()
  return token
}

async function createNavigation(request: APIRequestContext, token: string) {
  const res = await request.post(`${BASE}/api/navigation`, {
    headers: { Authorization: `JWT ${token}` },
    data: {
      title: 'E2E Test Menu',
      slug: `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
  })
  return res.json()
}

async function deleteNavigation(request: APIRequestContext, token: string, id: string) {
  await request.delete(`${BASE}/api/navigation/${id}`, {
    headers: { Authorization: `JWT ${token}` },
  })
}

async function createPage(
  request: APIRequestContext,
  token: string,
  data: { title: string; slug: string },
) {
  const res = await request.post(`${BASE}/api/pages`, {
    headers: { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' },
    data,
  })
  return res.json()
}

async function deletePage(request: APIRequestContext, token: string, id: string) {
  await request.delete(`${BASE}/api/pages/${id}`, {
    headers: { Authorization: `JWT ${token}` },
  })
}

// Clicks '+ Add item', waits for the drawer to open, returns the drawer locator.
async function clickAddItem(page: Page) {
  await page.getByRole('button', { name: '+ Add item' }).click()
  const drawer = getDrawer(page)
  await drawer.waitFor({ state: 'visible', timeout: 20_000 })
  return drawer
}

// Fills a URL-type item in an open drawer and saves it.
async function fillAndSave(drawer: Locator, page: Page, title: string, url: string) {
  await drawer.locator('input[name="title"]').fill(title)
  await drawer.locator('input[name="url"]').fill(url)
  await drawer.getByRole('button', { name: /save/i }).click()
  await expect(page.getByTestId('tree-item').first()).toBeVisible({ timeout: 20_000 })
}

test.describe.configure({ mode: 'serial' })

test.describe('Navigation admin UI', () => {
  let token: string
  let navId: string
  let navUrl: string
  let testPageId: string

  test.beforeEach(async ({ request }) => {
    token = await login(request)
    const nav = await createNavigation(request, token)
    navId = nav.doc?.id ?? nav.id
    navUrl = `${BASE}/admin/collections/navigation/${navId}`

    const testPage = await createPage(request, token, { title: 'Test About', slug: 'test-about' })
    testPageId = testPage.doc?.id ?? testPage.id
  })

  test.afterEach(async ({ request }) => {
    if (navId) await deleteNavigation(request, token, navId)
    if (testPageId) await deletePage(request, token, testPageId)
  })

  test('loads navigation document in admin', async ({ page }) => {
    await page.goto(navUrl)
    await expect(page.getByRole('heading', { name: 'E2E Test Menu' })).toBeVisible()
  })

  test('add button opens edit drawer automatically', async ({ page }) => {
    await page.goto(navUrl)
    const drawer = await clickAddItem(page)
    await expect(drawer).toBeVisible()
  })

  test('adds a URL menu item', async ({ page }) => {
    await page.goto(navUrl)
    const drawer = await clickAddItem(page)
    await fillAndSave(drawer, page, 'Home', 'https://example.com')

    const treeItem = page.getByTestId('tree-item').first()
    await expect(treeItem.getByText('Home')).toBeVisible()
    await expect(treeItem.getByText('https://example.com')).toBeVisible()
  })

  test('adds an internal page menu item', async ({ page }) => {
    await page.goto(navUrl)
    const drawer = await clickAddItem(page)

    await drawer.locator('input[name="title"]').fill('About Page')

    await selectOption(drawer.locator('#field-type .rs__control'), page, 'Internal page')

    // For a multi-collection relationship Payload renders a collection picker then value picker.
    // For a single-collection relationship it renders a single picker directly.
    const internalControl = drawer.locator('#field-internal .rs__control').last()
    await selectOption(internalControl, page, 'Test About')

    await drawer.getByRole('button', { name: /save/i }).click()
    await expect(page.getByTestId('tree-item').first()).toBeVisible({ timeout: 10_000 })

    const treeItem = page.getByTestId('tree-item').first()
    await expect(treeItem.getByText('About Page')).toBeVisible()
    await expect(treeItem.getByText('/test-about')).toBeVisible()
  })

  test('deletes a menu item with inline confirm', async ({ page }) => {
    await page.goto(navUrl)

    const drawer = await clickAddItem(page)
    await fillAndSave(drawer, page, 'To Delete', '/delete-me')

    const deleteBtn = page.locator('button[title="Delete item"]').first()
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()
    await page.getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText('Item deleted')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId('tree-item')).toHaveCount(0)
  })

  test('opens edit drawer for an existing item', async ({ page }) => {
    await page.goto(navUrl)

    const drawer = await clickAddItem(page)
    await fillAndSave(drawer, page, 'Edit Me', '/edit-me')

    await page.locator('button[title="Edit item"]').first().click()
    await expect(getDrawer(page)).toBeVisible({ timeout: 5_000 })
  })

  test('edits a menu item title', async ({ page }) => {
    await page.goto(navUrl)

    const drawer = await clickAddItem(page)
    await fillAndSave(drawer, page, 'Original Label', '/original')

    await page.locator('button[title="Edit item"]').first().click()
    const editDrawer = getDrawer(page)
    await editDrawer.waitFor({ state: 'visible' })

    const titleInput = editDrawer.locator('input[name="title"]')
    await titleInput.clear()
    await titleInput.fill('Updated Label')
    await editDrawer.getByRole('button', { name: /save/i }).click()

    await expect(page.getByTestId('tree-item').getByText('Updated Label')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('assigns a parent via the edit drawer', async ({ page }) => {
    await page.goto(navUrl)

    // Add parent
    let drawer = await clickAddItem(page)
    await fillAndSave(drawer, page, 'Parent Item', '/parent')

    // Add child
    drawer = await clickAddItem(page)
    await fillAndSave(drawer, page, 'Child Item', '/child')

    await expect(page.getByTestId('tree-item')).toHaveCount(2, { timeout: 5_000 })

    // Assign parent to child
    const childItem = page.getByTestId('tree-item').filter({ hasText: 'Child Item' })
    await childItem.locator('button[title="Edit item"]').click()
    const editDrawer = getDrawer(page)
    await editDrawer.waitFor({ state: 'visible' })

    await selectOption(editDrawer.locator('#field-parent .rs__control'), page, 'Parent Item')

    await editDrawer.getByRole('button', { name: /save/i }).click()

    await expect(page.getByTestId('tree-item')).toHaveCount(2, { timeout: 10_000 })
    const parentItem = page.getByTestId('tree-item').filter({ hasText: 'Parent Item' })
    await expect(
      parentItem.locator('[aria-label="Collapse"], [aria-label="Expand"]'),
    ).toBeVisible()
  })
})
