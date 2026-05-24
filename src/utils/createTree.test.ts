import { describe, expect, test } from 'vitest'

import type { Item } from '../types'

import { createCleanTree, createTree } from './createTree'

const items: Item[] = [
  { id: '1', type: 'url', depth: 0, parent: null, title: 'Home', href: '/' },
  { id: '2', type: 'url', depth: 0, parent: null, title: 'About', href: '/about' },
  { id: '3', type: 'url', depth: 1, parent: '2', title: 'Team', href: '/about/team' },
  { id: '4', type: 'url', depth: 1, parent: '2', title: 'History', href: '/about/history' },
  { id: '5', type: 'url', depth: 2, parent: '3', title: 'Staff', href: '/about/team/staff' },
]

describe('createTree', () => {
  test('builds nested tree from flat list', () => {
    const tree = createTree(items)
    expect(tree).toHaveLength(2)
    expect(tree[0].id).toBe('1')
    expect(tree[1].id).toBe('2')
    expect(tree[1].children).toHaveLength(2)
    expect(tree[1].children![0].id).toBe('3')
    expect(tree[1].children![0].children).toHaveLength(1)
    expect(tree[1].children![0].children![0].id).toBe('5')
  })

  test('returns empty array for empty input', () => {
    expect(createTree([])).toEqual([])
  })

  test('handles string parent ids', () => {
    const tree = createTree(items)
    const about = tree.find((i) => i.id === '2')
    expect(about?.children?.find((c) => c.id === '3')).toBeDefined()
  })

  test('handles object parent ids', () => {
    const withObjParent: Item[] = [
      { id: 'a', depth: 0, parent: null, title: 'Root' },
      { id: 'b', depth: 1, parent: { id: 'a' }, title: 'Child' },
    ]
    const tree = createTree(withObjParent)
    expect(tree[0]?.children).toHaveLength(1)
    expect(tree[0]?.children![0].id).toBe('b')
  })
})

describe('createCleanTree', () => {
  test('builds clean tree with only serializable fields', () => {
    const tree = createCleanTree(items)
    expect(tree[0]).toEqual({ id: '1', type: 'url', collapsed: false, depth: 0, parent: null, title: 'Home', href: '/' })
  })

  test('attaches children only when non-empty', () => {
    const tree = createCleanTree(items)
    const home = tree.find((i) => i.id === '1')
    expect(home).not.toHaveProperty('children')

    const about = tree.find((i) => i.id === '2')
    expect(about?.children).toHaveLength(2)
  })
})
