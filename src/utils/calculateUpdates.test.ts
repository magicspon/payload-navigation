import { describe, expect, test } from 'vitest'

import type { Menu } from '../types'

import { calculateUpdates } from './calculateUpdates'

const makeItem = (id: string, children: Menu[] = [], overrides: Partial<Menu> = {}): Menu => ({
  id,
  children,
  depth: 0,
  handle: 'h',
  parent: null,
  title: id,
  ...overrides,
})

describe('calculateUpdates', () => {
  test('returns updates for all items when originals have no order', () => {
    const newTree = [makeItem('a'), makeItem('b')]
    const original = [
      { id: 'a', _order: null, depth: 0, parent: null },
      { id: 'b', _order: null, depth: 0, parent: null },
    ]
    const updates = calculateUpdates(newTree, original)
    expect(updates.length).toBeGreaterThan(0)
    expect(updates.every((u) => u.depth === 0)).toBe(true)
    expect(updates.every((u) => u.parent === null)).toBe(true)
  })

  test('returns empty array when nothing changed', () => {
    const newTree = [makeItem('a'), makeItem('b')]
    const original = [
      { id: 'a', _order: null, depth: 0, parent: null },
      { id: 'b', _order: null, depth: 0, parent: null },
    ]
    const first = calculateUpdates(newTree, original)
    // Apply first pass as new originals
    const secondOriginal = first.map((u) => ({ id: u.id, _order: u._order, depth: u.depth, parent: u.parent }))
    const second = calculateUpdates(newTree, secondOriginal)
    expect(second).toHaveLength(0)
  })

  test('correctly sets depth for nested items', () => {
    const newTree = [makeItem('a', [makeItem('b', [makeItem('c')])])]
    const original = [
      { id: 'a', _order: null, depth: 0, parent: null },
      { id: 'b', _order: null, depth: 1, parent: 'a' },
      { id: 'c', _order: null, depth: 2, parent: 'b' },
    ]
    const updates = calculateUpdates(newTree, original)
    const bUpdate = updates.find((u) => u.id === 'b')
    const cUpdate = updates.find((u) => u.id === 'c')
    if (bUpdate) {expect(bUpdate.depth).toBe(1)}
    if (cUpdate) {expect(cUpdate.depth).toBe(2)}
  })

  test('detects parent change', () => {
    const newTree = [
      makeItem('a', [makeItem('b')]),
    ]
    const original = [
      { id: 'a', _order: 'a0', depth: 0, parent: null },
      { id: 'b', _order: 'a0', depth: 0, parent: null }, // was top-level, now nested
    ]
    const updates = calculateUpdates(newTree, original)
    const bUpdate = updates.find((u) => u.id === 'b')
    expect(bUpdate?.parent).toBe('a')
    expect(bUpdate?.depth).toBe(1)
  })
})
