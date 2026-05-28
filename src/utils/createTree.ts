import type { NavigationMenuItem, Item, Menu, ID } from '../types'
import { coerceId } from '../utils/coerceId'

function getParentId(item: Item): null | ID {
  if (item.parent === null || item.parent === undefined) {
    return null
  }

  if (typeof item.parent === 'object' && 'id' in item.parent) {
    return coerceId(item.parent.id)
  }
  return coerceId(item.parent)
}

function sameParent(a: null | ID, b: null | ID): boolean {
  if (a === null || b === null) return a === b
  return String(a) === String(b)
}

function buildChildren(parentId: null | ID, items: Item[], level: number): Menu[] {
  return items
    .filter((item) => sameParent(getParentId(item), parentId))
    .map((item) => ({
      ...item,
      depth: level,
      children: buildChildren(item.id, items, level + 1),
    }))
}

export function createTree(items: Item[]): Menu[] {
  return buildChildren(null, items, 0)
}

const EXCLUDED_FIELDS = new Set([
  '_order',
  'collapsed',
  'custom',
  'depth',
  'href',
  'id',
  'internal',
  'navigation',
  'parent',
  'passive',
  'title',
  'type',
  'url',
])

function buildCleanChildren<TExtra extends Record<string, unknown>>(
  parentId: null | ID,
  items: Item[],
  level: number,
): NavigationMenuItem<TExtra>[] {
  return items
    .filter((item) => sameParent(getParentId(item), parentId))
    .map((item) => {
      const children = buildCleanChildren<TExtra>(item.id, items, level + 1)
      const extra = Object.fromEntries(
        Object.entries(item).filter(([key]) => !EXCLUDED_FIELDS.has(key)),
      ) as TExtra
      const clean: NavigationMenuItem<TExtra> = {
        ...extra,
        id: item.id,
        type: (item.type as string) ?? '',
        collapsed: item.collapsed ?? false,
        depth: level,
        parent: getParentId(item),
        title: item.title,
        href: item.href ?? '',
      }
      if (children.length > 0) {
        clean.children = children
      }
      return clean
    })
}

export function createCleanTree<TExtra extends Record<string, unknown> = Record<string, never>>(
  items: Item[],
): NavigationMenuItem<TExtra>[] {
  return buildCleanChildren<TExtra>(null, items, 0)
}

export function normalizeDepths(nodes: Menu[], level = 0): Menu[] {
  return nodes.map((node) => ({
    ...node,
    depth: level,
    children: node.children?.length ? normalizeDepths(node.children, level + 1) : node.children,
  }))
}

/**
 * Returns true if any node sits at or beyond `maxDepth` levels deep (0-indexed),
 * matching the server-side guard in the menu_item beforeChange hook.
 */
export function exceedsMaxDepth(nodes: Menu[], maxDepth: number, level = 0): boolean {
  return nodes.some(
    (node) => level >= maxDepth || exceedsMaxDepth(node.children ?? [], maxDepth, level + 1),
  )
}
