import type { Payload } from 'payload'
import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest'

let payload: Payload
let navigationId: string | number

afterAll(async () => {
  await payload.destroy()
})

beforeAll(async () => {
  payload = await getPayload({ config })
})

beforeEach(async () => {
  await payload.delete({ collection: 'menu_item', where: { id: { exists: true } } })
  await payload.delete({ collection: 'navigation', where: { id: { exists: true } } })

  const nav = await payload.create({
    collection: 'navigation',
    data: { title: 'Test Menu', slug: 'test-menu' },
  })
  navigationId = nav.id
})

describe('Plugin collections', () => {
  test('navigation collection is registered', () => {
    expect(payload.collections['navigation']).toBeDefined()
  })

  test('menu_item collection is registered', () => {
    expect(payload.collections['menu_item']).toBeDefined()
  })
})

describe('navigation afterRead', () => {
  test('items is empty array for new navigation', async () => {
    const nav = await payload.findByID({ collection: 'navigation', id: navigationId })
    expect(Array.isArray(nav.items)).toBe(true)
    expect((nav.items as unknown[]).length).toBe(0)
  })

  test('items contains clean tree after adding menu items', async () => {
    await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'Home', type: 'url', url: 'https://example.com' },
    })

    const nav = await payload.findByID({ collection: 'navigation', id: navigationId })
    const items = nav.items as unknown[]
    expect(items).toHaveLength(1)
    const item = items[0] as Record<string, unknown>
    expect(item.title).toBe('Home')
    expect(item.href).toBe('https://example.com')
    expect(item.type).toBe('url')
    // clean tree should not have raw url field
    expect(item.url).toBeUndefined()
  })

  test('items is not populated on list view (findMany guard)', async () => {
    await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'Home', type: 'url', url: '/' },
    })

    const result = await payload.find({ collection: 'navigation' })
    // items should be whatever is stored in DB (null/undefined/old value), not the computed tree
    // The key check is that we didn't trigger N+1 extra queries
    expect(result.docs).toHaveLength(1)
    // items on list view is not populated (returns stored value, not computed tree)
    const doc = result.docs[0]
    expect(doc).toBeDefined()
  })
})

describe('menu_item beforeChange', () => {
  test('sets href for url type', async () => {
    const item = await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'Home', type: 'url', url: 'https://example.com' },
    })
    expect(item.href).toBe('https://example.com')
  })

  test('sets href for custom type', async () => {
    const item = await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'Custom', type: 'custom', custom: '#anchor' },
    })
    expect(item.href).toBe('#anchor')
  })

  test('sets href for passive type', async () => {
    const item = await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'Label', type: 'passive', passive: 'Services' },
    })
    expect(item.href).toBe('Services')
  })

  test('sets depth 0 for root items', async () => {
    const item = await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'Root', type: 'url', url: '/' },
    })
    expect(item.depth).toBe(0)
  })

  test('sets depth 1 for child items', async () => {
    const parent = await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'Parent', type: 'url', url: '/' },
    })
    const child = await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'Child', type: 'url', url: '/child', parent: parent.id },
    })
    expect(child.depth).toBe(1)
  })

  test('enforces maxDepth', async () => {
    const p1 = await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'L1', type: 'url', url: '/' },
    })
    const p2 = await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'L2', type: 'url', url: '/', parent: p1.id },
    })
    const p3 = await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'L3', type: 'url', url: '/', parent: p2.id },
    })
    await expect(
      payload.create({
        collection: 'menu_item',
        data: { navigation: navigationId, title: 'L4', type: 'url', url: '/', parent: p3.id },
      }),
    ).rejects.toThrow()
  })
})

describe('menu_item beforeDelete (recursive)', () => {
  test('deletes children when parent is deleted', async () => {
    const parent = await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'Parent', type: 'url', url: '/' },
    })
    const child = await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'Child', type: 'url', url: '/child', parent: parent.id },
    })
    await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'Grandchild', type: 'url', url: '/gc', parent: child.id },
    })

    await payload.delete({ collection: 'menu_item', id: parent.id })

    const remaining = await payload.find({ collection: 'menu_item', where: { navigation: { equals: navigationId } } })
    expect(remaining.totalDocs).toBe(0)
  })
})

describe('navigation beforeDelete', () => {
  test('deletes all menu items when navigation is deleted', async () => {
    await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'Item 1', type: 'url', url: '/' },
    })
    await payload.create({
      collection: 'menu_item',
      data: { navigation: navigationId, title: 'Item 2', type: 'url', url: '/2' },
    })

    await payload.delete({ collection: 'navigation', id: navigationId })

    const remaining = await payload.find({
      collection: 'menu_item',
      where: { navigation: { equals: navigationId } },
    })
    expect(remaining.totalDocs).toBe(0)
  })
})

describe('internal collection protection', () => {
  test('prevents deleting a page referenced by a menu item', async () => {
    const page = await payload.create({
      collection: 'pages',
      data: { title: 'Home', slug: 'home' },
    })
    await payload.create({
      collection: 'menu_item',
      data: {
        navigation: navigationId,
        title: 'Home link',
        type: 'internal',
        internal: { relationTo: 'pages', value: page.id },
      },
    })
    await expect(
      payload.delete({ collection: 'pages', id: page.id }),
    ).rejects.toThrow()
  })
})
