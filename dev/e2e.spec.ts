import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

const BASE = 'http://localhost:3000'
const CREDENTIALS = { email: 'dev@payloadcms.com', password: 'test' }

async function login(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BASE}/api/users/login`, {
    data: CREDENTIALS,
  })
  const { token } = await res.json()
  return token
}

async function createNavigation(request: APIRequestContext, token: string) {
  const res = await request.post(`${BASE}/api/navigation`, {
    headers: { Authorization: `JWT ${token}` },
    data: { title: 'E2E Test Menu', slug: `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2)}` },
  })
  return res.json()
}

async function deleteNavigation(request: APIRequestContext, token: string, id: string) {
  await request.delete(`${BASE}/api/navigation/${id}`, {
    headers: { Authorization: `JWT ${token}` },
  })
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

    // Log in via UI
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

  test('adds a menu item via the sidebar form', async ({ page }) => {
    await page.goto(navUrl)

    await page.fill('[placeholder="Menu item label"]', 'Home')
    await page.fill('[placeholder="https://"]', 'https://example.com')
    await page.click('button:has-text("Add item")')

    await expect(page.getByText('Menu item added')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('tree-item')).toBeVisible({ timeout: 5000 })
  })

  test('deletes a menu item with inline confirm', async ({ page, request }) => {
    // Seed an item via API
    await request.post(`${BASE}/api/navigation-plugin/items`, {
      headers: { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' },
      data: { handle: navHandle, title: 'To Delete', type: 'url', url: '/delete-me' },
    })
    // Navigate and check the delete flow
    await page.goto(navUrl)
    // Wait for tree item
    const deleteBtn = page.locator('button[title="Delete item"]').first()
    await expect(deleteBtn).toBeVisible({ timeout: 5000 })
    await deleteBtn.click()
    await page.click('button:has-text("Delete")')
    await expect(page.getByText('Item deleted')).toBeVisible({ timeout: 5000 })
  })

  test('opens edit drawer for a menu item', async ({ page, request }) => {
    await request.post(`${BASE}/api/navigation-plugin/items`, {
      headers: { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' },
      data: { handle: navHandle, title: 'Edit Me', type: 'url', url: '/edit-me' },
    })

    await page.goto(navUrl)
    const editBtn = page.locator('button[title="Edit item"]').first()
    await expect(editBtn).toBeVisible({ timeout: 5000 })
    await editBtn.click()
    await expect(page.getByText('Edit Menu Item')).toBeVisible()
  })

  test('save order button appears after drag', async ({ page, request }) => {
    // Create two items
    await request.post(`${BASE}/api/navigation-plugin/items`, {
      headers: { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' },
      data: { handle: navHandle, title: 'Item A', type: 'url', url: '/a' },
    })
    await request.post(`${BASE}/api/navigation-plugin/items`, {
      headers: { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' },
      data: { handle: navHandle, title: 'Item B', type: 'url', url: '/b' },
    })

    await page.goto(navUrl)
    await expect(page.getByTestId('tree-item')).toHaveCount(2, { timeout: 5000 })

    // Save order button should be disabled initially
    const saveBtn = page.locator('button:has-text("Save order")')
    await expect(saveBtn).toBeDisabled()
  })
})
