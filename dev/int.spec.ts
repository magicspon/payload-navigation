import type { Payload } from 'payload'
import config from '@payload-config'
import { createPayloadRequest, getPayload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'

import { itemsAddHandler } from '../src/endpoints/items-add.js'
import { itemsDeleteHandler } from '../src/endpoints/items-delete.js'
import { itemsGetHandler } from '../src/endpoints/items-get.js'
import { itemsPatchCollapsedHandler } from '../src/endpoints/items-patch-collapsed.js'
import { itemsUpdateHandler } from '../src/endpoints/items-update.js'
import { parentOptionsHandler } from '../src/endpoints/parent-options.js'
import { reorderHandler } from '../src/endpoints/reorder.js'

let payload: Payload
let navigationHandle: string
let navigationId: string

async function makeRequest(
  url: string,
  options: RequestInit = {},
  user?: Record<string, unknown>,
) {
  const request = new Request(`http://localhost:3000${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const payloadRequest = await createPayloadRequest({ config, request })
  if (user) (payloadRequest as unknown as { user: unknown }).user = user
  return payloadRequest
}

const adminUser = { id: 'admin', email: 'dev@payloadcms.com', collection: 'users' }

afterAll(async () => {
  await payload.destroy()
})

beforeAll(async () => {
  payload = await getPayload({ config })
})

beforeEach(async () => {
  // Clean up and create a fresh navigation doc for each test
  await payload.delete({ collection: 'menu_item', where: { id: { exists: true } } })
  await payload.delete({ collection: 'navigation', where: { id: { exists: true } } })

  const nav = await payload.create({
    collection: 'navigation',
    data: { title: 'Test Menu', slug: 'test-menu' },
  })
  navigationId = nav.id
  navigationHandle = nav.handle as string
})

describe('GET /navigation-plugin/items', () => {
  test('returns empty array for new navigation', async () => {
    const req = await makeRequest(
      `/api/navigation-plugin/items?handle=${navigationHandle}`,
      { method: 'GET' },
      adminUser,
    )
    const res = await itemsGetHandler(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual([])
  })

  test('returns 401 without user', async () => {
    const req = await makeRequest(
      `/api/navigation-plugin/items?handle=${navigationHandle}`,
      { method: 'GET' },
    )
    await expect(itemsGetHandler(req)).rejects.toMatchObject({ status: 401 })
  })

  test('returns 400 without handle', async () => {
    const req = await makeRequest('/api/navigation-plugin/items', { method: 'GET' }, adminUser)
    await expect(itemsGetHandler(req)).rejects.toMatchObject({ status: 400 })
  })
})

describe('POST /navigation-plugin/items', () => {
  test('creates a url menu item', async () => {
    const req = await makeRequest(
      '/api/navigation-plugin/items',
      {
        method: 'POST',
        body: JSON.stringify({ handle: navigationHandle, title: 'Home', type: 'url', url: 'https://example.com' }),
      },
      adminUser,
    )
    const res = await itemsAddHandler(req)
    expect(res.status).toBe(200)
    const { tree, docs } = await res.json()
    expect(docs).toHaveLength(1)
    expect(docs[0].title).toBe('Home')
    expect(docs[0].type).toBe('url')
    expect(tree).toHaveLength(1)
    expect(tree[0].title).toBe('Home')
  })

  test('creates a custom menu item', async () => {
    const req = await makeRequest(
      '/api/navigation-plugin/items',
      {
        method: 'POST',
        body: JSON.stringify({ handle: navigationHandle, title: 'Products', type: 'custom', custom: '#products' }),
      },
      adminUser,
    )
    const res = await itemsAddHandler(req)
    const { docs } = await res.json()
    expect(docs[0].type).toBe('custom')
  })

  test('creates a passive menu item', async () => {
    const req = await makeRequest(
      '/api/navigation-plugin/items',
      {
        method: 'POST',
        body: JSON.stringify({ handle: navigationHandle, title: 'Services', type: 'passive', passive: 'Services' }),
      },
      adminUser,
    )
    const res = await itemsAddHandler(req)
    const { docs } = await res.json()
    expect(docs[0].type).toBe('passive')
  })

  test('returns 401 without user', async () => {
    const req = await makeRequest(
      '/api/navigation-plugin/items',
      { method: 'POST', body: JSON.stringify({ handle: navigationHandle, title: 'X', type: 'url', url: 'https://x.com' }) },
    )
    await expect(itemsAddHandler(req)).rejects.toMatchObject({ status: 401 })
  })

  test('returns 400 for missing required fields', async () => {
    const req = await makeRequest(
      '/api/navigation-plugin/items',
      { method: 'POST', body: JSON.stringify({ handle: navigationHandle, title: 'X' }) },
      adminUser,
    )
    await expect(itemsAddHandler(req)).rejects.toMatchObject({ status: 400 })
  })
})

describe('PUT /navigation-plugin/items/:id', () => {
  test('updates a menu item', async () => {
    // Create first
    const createReq = await makeRequest(
      '/api/navigation-plugin/items',
      { method: 'POST', body: JSON.stringify({ handle: navigationHandle, title: 'Old', type: 'url', url: 'https://old.com' }) },
      adminUser,
    )
    const { docs } = await (await itemsAddHandler(createReq)).json()
    const itemId = docs[0].id

    // Update
    const updateReq = await makeRequest(
      `/api/navigation-plugin/items/${itemId}`,
      { method: 'PUT', body: JSON.stringify({ handle: navigationHandle, title: 'New', type: 'url', url: 'https://new.com' }) },
      adminUser,
    )
    ;(updateReq as unknown as { routeParams: unknown }).routeParams = { id: itemId }
    const res = await itemsUpdateHandler(updateReq)
    const { tree, docs: updatedDocs } = await res.json()
    expect(updatedDocs[0].title).toBe('New')
    expect(tree[0].title).toBe('New')
  })
})

describe('DELETE /navigation-plugin/items/:id', () => {
  test('deletes a menu item and its children', async () => {
    // Create parent
    const parentReq = await makeRequest(
      '/api/navigation-plugin/items',
      { method: 'POST', body: JSON.stringify({ handle: navigationHandle, title: 'Parent', type: 'url', url: '/' }) },
      adminUser,
    )
    const { docs: parentDocs } = await (await itemsAddHandler(parentReq)).json()
    const parentId = parentDocs[0].id

    // Create child
    const childReq = await makeRequest(
      '/api/navigation-plugin/items',
      { method: 'POST', body: JSON.stringify({ handle: navigationHandle, title: 'Child', type: 'url', url: '/child', parent: parentId }) },
      adminUser,
    )
    await itemsAddHandler(childReq)

    // Delete parent
    const deleteReq = await makeRequest(
      `/api/navigation-plugin/items/${parentId}?handle=${navigationHandle}`,
      { method: 'DELETE' },
      adminUser,
    )
    ;(deleteReq as unknown as { routeParams: unknown }).routeParams = { id: parentId }
    const res = await itemsDeleteHandler(deleteReq)
    const { tree, docs: remaining } = await res.json()
    expect(remaining).toHaveLength(0)
    expect(tree).toHaveLength(0)
  })
})

describe('POST /navigation-plugin/reorder', () => {
  test('reorders items and updates parent/depth', async () => {
    // Create two items
    const r1 = await makeRequest(
      '/api/navigation-plugin/items',
      { method: 'POST', body: JSON.stringify({ handle: navigationHandle, title: 'A', type: 'url', url: '/a' }) },
      adminUser,
    )
    const { docs: docs1 } = await (await itemsAddHandler(r1)).json()
    const idA = docs1[0].id

    const r2 = await makeRequest(
      '/api/navigation-plugin/items',
      { method: 'POST', body: JSON.stringify({ handle: navigationHandle, title: 'B', type: 'url', url: '/b' }) },
      adminUser,
    )
    const { docs: docs2 } = await (await itemsAddHandler(r2)).json()
    const idB = docs2.find((d: { title: string }) => d.title === 'B').id

    const reorderReq = await makeRequest(
      '/api/navigation-plugin/reorder',
      {
        method: 'POST',
        body: JSON.stringify({
          handle: navigationHandle,
          updates: [
            { id: idA, _order: 'a0', parent: idB, depth: 1 },
          ],
        }),
      },
      adminUser,
    )
    const res = await reorderHandler(reorderReq)
    expect(res.status).toBe(200)
    const { tree, docs } = await res.json()
    expect(tree).toBeDefined()
    expect(docs).toBeDefined()
  })
})

describe('GET /navigation-plugin/parent-options', () => {
  test('returns menu items for the handle', async () => {
    const r1 = await makeRequest(
      '/api/navigation-plugin/items',
      { method: 'POST', body: JSON.stringify({ handle: navigationHandle, title: 'Home', type: 'url', url: '/' }) },
      adminUser,
    )
    await itemsAddHandler(r1)

    const req = await makeRequest(
      `/api/navigation-plugin/parent-options?handle=${navigationHandle}`,
      { method: 'GET' },
      adminUser,
    )
    const res = await parentOptionsHandler(req)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].title).toBe('Home')
  })

  test('excludes item by excludeId', async () => {
    const r1 = await makeRequest(
      '/api/navigation-plugin/items',
      { method: 'POST', body: JSON.stringify({ handle: navigationHandle, title: 'Home', type: 'url', url: '/' }) },
      adminUser,
    )
    const { docs } = await (await itemsAddHandler(r1)).json()
    const itemId = docs[0].id

    const req = await makeRequest(
      `/api/navigation-plugin/parent-options?handle=${navigationHandle}&excludeId=${itemId}`,
      { method: 'GET' },
      adminUser,
    )
    const res = await parentOptionsHandler(req)
    const data = await res.json()
    expect(data).toHaveLength(0)
  })
})

describe('PATCH /navigation-plugin/items/:id (collapsed)', () => {
  test('toggles collapsed and returns updated tree', async () => {
    const createReq = await makeRequest(
      '/api/navigation-plugin/items',
      { method: 'POST', body: JSON.stringify({ handle: navigationHandle, title: 'Home', type: 'url', url: '/' }) },
      adminUser,
    )
    const { docs } = await (await itemsAddHandler(createReq)).json()
    const itemId = docs[0].id

    const patchReq = await makeRequest(
      `/api/navigation-plugin/items/${itemId}`,
      { method: 'PATCH', body: JSON.stringify({ collapsed: true, handle: navigationHandle }) },
      adminUser,
    )
    ;(patchReq as unknown as { routeParams: unknown }).routeParams = { id: itemId }
    const res = await itemsPatchCollapsedHandler(patchReq)
    expect(res.status).toBe(200)

    const { tree, docs: updatedDocs } = await res.json()
    expect(tree).toBeDefined()
    const found = updatedDocs.find((d: { id: unknown }) => String(d.id) === String(itemId))
    expect(found?.collapsed).toBe(true)
  })

  test('returns 400 when collapsed is not a boolean', async () => {
    const createReq = await makeRequest(
      '/api/navigation-plugin/items',
      { method: 'POST', body: JSON.stringify({ handle: navigationHandle, title: 'X', type: 'url', url: '/x' }) },
      adminUser,
    )
    const { docs } = await (await itemsAddHandler(createReq)).json()
    const itemId = docs[0].id

    const patchReq = await makeRequest(
      `/api/navigation-plugin/items/${itemId}`,
      { method: 'PATCH', body: JSON.stringify({ collapsed: 'yes', handle: navigationHandle }) },
      adminUser,
    )
    ;(patchReq as unknown as { routeParams: unknown }).routeParams = { id: itemId }
    await expect(itemsPatchCollapsedHandler(patchReq)).rejects.toMatchObject({ status: 400 })
  })
})

describe('Plugin collections', () => {
  test('navigation collection is registered', () => {
    expect(payload.collections['navigation']).toBeDefined()
  })

  test('menu_item collection is registered', () => {
    expect(payload.collections['menu_item']).toBeDefined()
  })

  test('navigation has handle auto-generated', async () => {
    const nav = await payload.findByID({ collection: 'navigation', id: navigationId })
    expect(nav.handle).toBeTruthy()
    expect(typeof nav.handle).toBe('string')
  })
})
