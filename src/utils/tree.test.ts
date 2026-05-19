import { describe, expect, test } from 'vitest'

import type { Menu } from '../types'

import { tree } from './tree'

const makeItem = (id: string, children: Menu[] = []): Menu => ({
  id,
  children,
  handle: 'h',
  title: id,
})

const data: Menu[] = [
  makeItem('a', [makeItem('a1'), makeItem('a2')]),
  makeItem('b'),
  makeItem('c', [makeItem('c1', [makeItem('c1a')])]),
]

describe('tree.find', () => {
  test('finds a top-level item', () => {
    expect(tree.find(data, 'b')?.id).toBe('b')
  })

  test('finds a nested item', () => {
    expect(tree.find(data, 'a2')?.id).toBe('a2')
  })

  test('finds a deeply nested item', () => {
    expect(tree.find(data, 'c1a')?.id).toBe('c1a')
  })

  test('returns undefined for missing id', () => {
    expect(tree.find(data, 'z')).toBeUndefined()
  })
})

describe('tree.remove', () => {
  test('removes a top-level item', () => {
    const result = tree.remove(data, 'b')
    expect(result).toHaveLength(2)
    expect(result.find((i) => i.id === 'b')).toBeUndefined()
  })

  test('removes a nested item', () => {
    const result = tree.remove(data, 'a1')
    const a = result.find((i) => i.id === 'a')
    expect(a?.children).toHaveLength(1)
    expect(a?.children![0]!.id).toBe('a2')
  })
})

describe('tree.insertBefore', () => {
  test('inserts before a top-level item', () => {
    const newItem = makeItem('x')
    const result = tree.insertBefore(data, 'b', newItem)
    const idx = result.findIndex((i) => i.id === 'x')
    expect(idx).toBe(1)
    expect(result[2].id).toBe('b')
  })

  test('inserts before a nested item', () => {
    const newItem = makeItem('x')
    const result = tree.insertBefore(data, 'a2', newItem)
    const a = result.find((i) => i.id === 'a')
    expect(a?.children?.findIndex((c) => c.id === 'x')).toBe(1)
  })
})

describe('tree.insertAfter', () => {
  test('inserts after a top-level item', () => {
    const newItem = makeItem('x')
    const result = tree.insertAfter(data, 'b', newItem)
    const idx = result.findIndex((i) => i.id === 'x')
    expect(idx).toBe(2)
  })
})

describe('tree.insertChild', () => {
  test('inserts as first child of target', () => {
    const newItem = makeItem('x')
    const result = tree.insertChild(data, 'b', newItem)
    const b = result.find((i) => i.id === 'b')
    expect(b?.children![0]!.id).toBe('x')
  })

  test('prepends to existing children', () => {
    const newItem = makeItem('x')
    const result = tree.insertChild(data, 'a', newItem)
    const a = result.find((i) => i.id === 'a')
    expect(a?.children![0]!.id).toBe('x')
    expect(a?.children).toHaveLength(3)
  })
})
