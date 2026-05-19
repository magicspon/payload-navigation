import type { NavigationMenuItem, Item, Menu } from '../types'

function getParentId(item: Item): null | string {
  if (item.parent === null || item.parent === undefined) {return null}
  if (typeof item.parent === 'string') {return item.parent}
  if (typeof item.parent === 'object' && 'id' in item.parent) {return item.parent.id}
  return null
}

function buildChildren(parentId: null | string, items: Item[]): Menu[] {
  return items
    .filter((item) => getParentId(item) === parentId)
    .map((item) => ({ ...item, children: buildChildren(item.id, items) }))
}

export function createTree(items: Item[]): Menu[] {
  return buildChildren(null, items)
}

function buildCleanChildren(parentId: null | string, items: Item[]): NavigationMenuItem[] {
  return items
    .filter((item) => getParentId(item) === parentId)
    .map((item) => {
      const children = buildCleanChildren(item.id, items)
      const clean: NavigationMenuItem = {
        id: item.id,
        type: (item.type as string) ?? '',
        depth: item.depth ?? 0,
        parent: getParentId(item),
        title: item.title,
        href: item.value ?? '',
      }
      if (children.length > 0) {clean.children = children}
      return clean
    })
}

export function createCleanTree(items: Item[]): NavigationMenuItem[] {
  return buildCleanChildren(null, items)
}
