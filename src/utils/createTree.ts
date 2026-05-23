import type { NavigationMenuItem, Item, Menu } from '../types'

function getParentId(item: Item): null | string {
  if (item.parent === null || item.parent === undefined) {return null}
  if (typeof item.parent === 'string') {return item.parent}
  if (typeof item.parent === 'object' && 'id' in item.parent) {return String(item.parent.id)}
  return null
}

function buildChildren(parentId: null | string, items: Item[], level: number): Menu[] {
  return items
    .filter((item) => getParentId(item) === parentId)
    .map((item) => ({
      ...item,
      id: String(item.id),
      depth: level,
      children: buildChildren(String(item.id), items, level + 1),
    }))
}

export function createTree(items: Item[]): Menu[] {
  return buildChildren(null, items, 0)
}

function buildCleanChildren(parentId: null | string, items: Item[], level: number): NavigationMenuItem[] {
  return items
    .filter((item) => getParentId(item) === parentId)
    .map((item) => {
      const children = buildCleanChildren(item.id, items, level + 1)
      const clean: NavigationMenuItem = {
        id: item.id,
        type: (item.type as string) ?? '',
        collapsed: item.collapsed ?? false,
        depth: level,
        parent: getParentId(item),
        title: item.title,
        href: item.value ?? '',
      }
      if (children.length > 0) {clean.children = children}
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
