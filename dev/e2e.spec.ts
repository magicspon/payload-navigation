import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

const BASE = 'http://localhost:3000'
const CREDENTIALS = { email: 'dev@payloadcms.com', password: 'test' }

// Open a Payload react-select and choose an option.
// Payload renders <div id="field-{path}"> as the outer wrapper; react-select
// lives inside it with class "rs__control". We use .last() to prefer the
// element rendered later in the DOM (e.g. inside the edit drawer overlay).
async function selectOption(page: Page, fieldPath: string, optionText: string) {
  const control = page.locator(`#field-${fieldPath} .rs__control`).last()
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

test.describe.configure({ mode: 'serial' })

test.describe('Navigation admin UI', () => {
  let token: string
  let navId: string
  let navUrl: string
  let testPageId: string

  test.beforeEach(async ({ request, page }) => {
    token = await login(request)
    const nav = await createNavigation(request, token)
    navId = nav.doc?.id ?? nav.id
    navUrl = `${BASE}/admin/collections/navigation/${navId}`

    // Create a test page to use for internal page tests
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

    // Select the test page created in beforeEach
    await selectOption(page, 'nav-page', 'Test About')

    await page.click('button:has-text("Add item")')

    await expect(page.getByText('Menu item added')).toBeVisible({ timeout: 5000 })
    const treeItem = page.getByTestId('tree-item').first()
    await expect(treeItem).toBeVisible({ timeout: 5000 })
    await expect(treeItem.getByText('About Page')).toBeVisible()
    // resolveInternalUrl maps slug → /test-about
    await expect(treeItem.getByText('/test-about')).toBeVisible()
  })

  test('deletes a menu item with inline confirm', async ({ page }) => {
    await page.goto(navUrl)

    // Add an item via UI first, then delete it
    await page.fill('[placeholder="Menu item label"]', 'To Delete')
    await page.fill('[placeholder="https://"]', '/delete-me')
    await page.click('button:has-text("Add item")')
    await expect(page.getByTestId('tree-item')).toBeVisible({ timeout: 5000 })

    const deleteBtn = page.locator('button[title="Delete item"]').first()
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()
    await page.click('button:has-text("Delete")')
    await expect(page.getByText('Item deleted')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('tree-item')).toHaveCount(0)
  })

  test('opens edit drawer for a menu item', async ({ page }) => {
    await page.goto(navUrl)

    await page.fill('[placeholder="Menu item label"]', 'Edit Me')
    await page.fill('[placeholder="https://"]', '/edit-me')
    await page.click('button:has-text("Add item")')
    await expect(page.getByTestId('tree-item')).toBeVisible({ timeout: 5000 })

    const editBtn = page.locator('button[title="Edit item"]').first()
    await editBtn.click()
    await expect(page.getByText('Edit Menu Item')).toBeVisible()
  })

  test('edits a menu item label', async ({ page }) => {
    await page.goto(navUrl)

    await page.fill('[placeholder="Menu item label"]', 'Original Label')
    await page.fill('[placeholder="https://"]', '/original')
    await page.click('button:has-text("Add item")')
    await expect(page.getByTestId('tree-item')).toBeVisible({ timeout: 5000 })

    const editBtn = page.locator('button[title="Edit item"]').first()
    await editBtn.click()

    const drawer = page.getByTestId('edit-drawer')
    await expect(drawer).toBeVisible()

    const titleInput = drawer.locator('[placeholder="Menu item label"]')
    await titleInput.clear()
    await titleInput.fill('Updated Label')

    await drawer.locator('button:has-text("Save")').click()
    await expect(page.getByText('Menu item updated')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('tree-item').getByText('Updated Label')).toBeVisible()
  })

  test('edits a menu item parent assignment', async ({ page }) => {
    await page.goto(navUrl)

    // Add Parent Item
    await page.fill('[placeholder="Menu item label"]', 'Parent Item')
    await page.fill('[placeholder="https://"]', '/parent')
    await page.click('button:has-text("Add item")')
    await expect(page.getByText('Menu item added')).toBeVisible({ timeout: 5000 })

    // Add Child Item
    await page.fill('[placeholder="Menu item label"]', 'Child Item')
    await page.fill('[placeholder="https://"]', '/child')
    await page.click('button:has-text("Add item")')
    await expect(page.getByText('Menu item added')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('tree-item')).toHaveCount(2, { timeout: 5000 })

    // Open the edit drawer for "Child Item"
    const childItem = page.getByTestId('tree-item').filter({ hasText: 'Child Item' })
    await childItem.locator('button[title="Edit item"]').click()

    const drawer = page.getByTestId('edit-drawer')
    await expect(drawer).toBeVisible()

    // Assign "Parent Item" as parent — scope to the drawer
    const parentControl = drawer.locator('#field-nav-parent .rs__control')
    await parentControl.waitFor({ state: 'visible' })
    await parentControl.click()
    await page.locator('.rs__option', { hasText: 'Parent Item' }).first().click()

    await drawer.locator('button:has-text("Save")').click()
    await expect(page.getByText('Menu item updated')).toBeVisible({ timeout: 5000 })

    // Both items still present; Child Item is now nested under Parent Item
    await expect(page.getByTestId('tree-item')).toHaveCount(2, { timeout: 5000 })
    // Parent Item should show a collapse/expand control since it has a child
    const parentItem = page.getByTestId('tree-item').filter({ hasText: 'Parent Item' })
    await expect(parentItem.locator('[aria-label="Collapse"], [aria-label="Expand"]')).toBeVisible()
  })
})
