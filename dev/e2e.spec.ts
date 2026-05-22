import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

const BASE = 'http://localhost:3000'
const CREDENTIALS = { email: 'dev@payloadcms.com', password: 'test' }

// Open a Payload react-select by its field path and choose an option.
// Uses CSS :has() to scope to the correct control, then .last() to prefer
// elements rendered later in the DOM (e.g. inside the edit drawer overlay).
async function selectOption(page: Page, fieldPath: string, optionText: string) {
  const controls = page.locator(`[class*="__control"]:has(#field-${fieldPath})`)
  await controls.last().click()
  await page.locator('[class*="__option"]', { hasText: optionText }).first().click()
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

async function seedItem(
  request: APIRequestContext,
  token: string,
  handle: string,
  data: Record<string, unknown>,
) {
  const res = await request.post(`${BASE}/api/navigation-plugin/items`, {
    headers: { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' },
    data: { handle, ...data },
  })
  return res.json()
}

test.describe.configure({ mode: 'serial' })

test.describe('Navigation admin UI', () => {
  let token: string
  let navId: string
  let navHandle: string
  let navUrl: string

  test.beforeEach(async ({ request, page }) => {
    token = await login(request)
    const nav = await createNavigation(request, token)
    navId = nav.doc?.id ?? nav.id
    navHandle = nav.doc?.handle ?? nav.handle
    navUrl = `${BASE}/admin/collections/navigation/${navId}`

    await page.goto(`${BASE}/admin`)
    await page.fill('#field-email', CREDENTIALS.email)
    await page.fill('#field-password', CREDENTIALS.password)
    await page.click('.form-submit button')
    await page.waitForURL(`${BASE}/admin`)
  })

  test.afterEach(async ({ request }) => {
    if (navId) await deleteNavigation(request, token, navId)
  })

  test('loads navigation document in admin', async ({ page }) => {
    await page.goto(navUrl)
    await expect(page.getByRole('heading', { name: 'E2E Test Menu' })).toBeVisible()
  })

  test('adds a URL menu item via the sidebar form', async ({ page }) => {
    await page.goto(navUrl)

    await page.fill('[placeholder="Menu item label"]', 'Home')
    await page.fill('[placeholder="https://"]', 'https://example.com')
    await page.click('button:has-text("Add item")')

    await expect(page.getByText('Menu item added')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('tree-item')).toBeVisible({ timeout: 5000 })
  })

  test('adds an internal page menu item', async ({ page }) => {
    await page.goto(navUrl)

    await page.fill('[placeholder="Menu item label"]', 'About Page')

    // Switch to "Internal page" type
    await selectOption(page, 'nav-type', 'Internal page')

    // Select the "pages" collection (both pages and posts are available)
    await selectOption(page, 'nav-collection', 'pages')

    // Select the "About" page that was seeded on startup
    await selectOption(page, 'nav-page', 'About')

    await page.click('button:has-text("Add item")')

    await expect(page.getByText('Menu item added')).toBeVisible({ timeout: 5000 })
    const treeItem = page.getByTestId('tree-item').first()
    await expect(treeItem).toBeVisible({ timeout: 5000 })
    await expect(treeItem.getByText('About Page')).toBeVisible()
    // Value should be resolved to the slug URL
    await expect(treeItem.getByText('/about')).toBeVisible()
  })

  test('deletes a menu item with inline confirm', async ({ page, request }) => {
    await seedItem(request, token, navHandle, {
      title: 'To Delete',
      type: 'url',
      url: '/delete-me',
    })

    await page.goto(navUrl)
    const deleteBtn = page.locator('button[title="Delete item"]').first()
    await expect(deleteBtn).toBeVisible({ timeout: 5000 })
    await deleteBtn.click()
    await page.click('button:has-text("Delete")')
    await expect(page.getByText('Item deleted')).toBeVisible({ timeout: 5000 })
  })

  test('opens edit drawer for a menu item', async ({ page, request }) => {
    await seedItem(request, token, navHandle, { title: 'Edit Me', type: 'url', url: '/edit-me' })

    await page.goto(navUrl)
    const editBtn = page.locator('button[title="Edit item"]').first()
    await expect(editBtn).toBeVisible({ timeout: 5000 })
    await editBtn.click()
    await expect(page.getByText('Edit Menu Item')).toBeVisible()
  })

  test('edits a menu item label', async ({ page, request }) => {
    await seedItem(request, token, navHandle, {
      title: 'Original Label',
      type: 'url',
      url: '/original',
    })

    await page.goto(navUrl)
    const editBtn = page.locator('button[title="Edit item"]').first()
    await expect(editBtn).toBeVisible({ timeout: 5000 })
    await editBtn.click()
    await expect(page.getByText('Edit Menu Item')).toBeVisible()

    // The drawer's title input is the last one on the page
    // (the main MenuBuilder form also has one with the same placeholder)
    const titleInput = page.locator('[placeholder="Menu item label"]').last()
    await titleInput.clear()
    await titleInput.fill('Updated Label')

    await page.locator('button:has-text("Save")').last().click()
    await expect(page.getByText('Menu item updated')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('tree-item').getByText('Updated Label')).toBeVisible()
  })

  test('edits a menu item parent assignment', async ({ page, request }) => {
    await seedItem(request, token, navHandle, {
      title: 'Parent Item',
      type: 'url',
      url: '/parent',
    })
    await seedItem(request, token, navHandle, {
      title: 'Child Item',
      type: 'url',
      url: '/child',
    })

    await page.goto(navUrl)
    await expect(page.getByTestId('tree-item')).toHaveCount(2, { timeout: 5000 })

    // Open the edit drawer for "Child Item"
    const childItem = page.getByTestId('tree-item').filter({ hasText: 'Child Item' })
    await childItem.locator('button[title="Edit item"]').click()
    await expect(page.getByText('Edit Menu Item')).toBeVisible()

    // Assign "Parent Item" as its parent; .last() targets the drawer's select
    await selectOption(page, 'nav-parent', 'Parent Item')

    await page.locator('button:has-text("Save")').last().click()
    await expect(page.getByText('Menu item updated')).toBeVisible({ timeout: 5000 })

    // Both items still present; Child Item is now nested
    await expect(page.getByTestId('tree-item')).toHaveCount(2, { timeout: 5000 })
    // Parent Item should show a collapse/expand control since it now has a child
    const parentItem = page.getByTestId('tree-item').filter({ hasText: 'Parent Item' })
    await expect(parentItem.locator('[aria-label="Collapse"], [aria-label="Expand"]')).toBeVisible()
  })

  test('save order button is disabled before any reorder', async ({ page, request }) => {
    await seedItem(request, token, navHandle, { title: 'Item A', type: 'url', url: '/a' })
    await seedItem(request, token, navHandle, { title: 'Item B', type: 'url', url: '/b' })

    await page.goto(navUrl)
    await expect(page.getByTestId('tree-item')).toHaveCount(2, { timeout: 5000 })

    const saveBtn = page.locator('button:has-text("Save order")')
    await expect(saveBtn).toBeDisabled()
  })
})
