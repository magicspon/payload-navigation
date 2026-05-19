import { describe, expect, test } from 'vitest'

import type { Menu } from '../types'

import { isDescendant } from './isDescendant'

const makeItem = (id: string, children: Menu[] = []): Menu => ({
  id,
  children,
  handle: 'h',
  title: id,
})

const data: Menu[] = [
  makeItem('a', [makeItem('a1', [makeItem('a1x')]), makeItem('a2')]),
  makeItem('b'),
]

describe('isDescendant', () => {
  test('returns true when target is a direct child of source', () => {
    expect(isDescendant('a', 'a1', data)).toBe(true)
  })

  test('returns true when target is a deep descendant of source', () => {
    expect(isDescendant('a', 'a1x', data)).toBe(true)
  })

  test('returns false when target is not a descendant', () => {
    expect(isDescendant('a', 'b', data)).toBe(false)
  })

  test('returns false for self', () => {
    expect(isDescendant('a', 'a', data)).toBe(false)
  })

  test('returns false when source not found', () => {
    expect(isDescendant('z', 'a', data)).toBe(false)
  })

  test('returns false for sibling', () => {
    expect(isDescendant('a1', 'a2', data)).toBe(false)
  })
})
