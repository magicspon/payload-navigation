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

function buildCleanChildren(
  parentId: null | ID,
  items: Item[],
  level: number,
): NavigationMenuItem[] {
  return items
    .filter((item) => sameParent(getParentId(item), parentId))
    .map((item) => {
      const children = buildCleanChildren(item.id, items, level + 1)
      const clean: NavigationMenuItem = {
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

export function createCleanTree(items: Item[]): NavigationMenuItem[] {
  return buildCleanChildren(null, items, 0)
}

export function normalizeDepths(nodes: Menu[], level = 0): Menu[] {
  return nodes.map((node) => ({
    ...node,
    depth: level,
    children: node.children?.length ? normalizeDepths(node.children, level + 1) : node.children,
  }))
}
