import { generateKeyBetween } from 'payload/shared'

import type { ID, Menu } from '../types'

type OriginalItem = {
  [key: string]: unknown
  _order?: null | string
  depth?: null | number
  id: ID
  parent?: { id: ID } | null | ID
}

type UpdateItem = {
  _order: string
  depth: number
  id: ID
  parent: null | ID
}

export function calculateUpdates(newTree: Menu[], originalData: OriginalItem[]): UpdateItem[] {
  const originalMap = new Map(
    originalData.map((item) => {
      const rawParent = item.parent
      const parentId =
        rawParent === null || rawParent === undefined
          ? null
          : typeof rawParent === 'string' || typeof rawParent === 'number'
            ? String(rawParent)
            : typeof rawParent === 'object' && 'id' in rawParent
              ? String((rawParent as { id: unknown }).id)
              : null
      return [
        String(item.id),
        { _order: item._order ?? '', depth: item.depth ?? 0, parent: parentId },
      ]
    }),
  )

  const updates: UpdateItem[] = []

  function traverse(items: Menu[], parent: null | ID, depth: number) {
    let previousOrder: null | string = null

    for (const item of items) {
      const newOrder = generateKeyBetween(previousOrder, null)
      previousOrder = newOrder

      const original = originalMap.get(String(item.id))
      if (!original) {
        updates.push({ id: item.id, _order: newOrder, depth, parent })
      } else {
        const parentChanged =
          original.parent === null || parent === null
            ? original.parent !== parent
            : String(original.parent) !== String(parent)
        if (original._order !== newOrder || parentChanged || original.depth !== depth) {
          updates.push({ id: item.id, _order: newOrder, depth, parent })
        }
      }

      if (item.children?.length) {
        traverse(item.children, item.id, depth + 1)
      }
    }
  }

  traverse(newTree, null, 0)
  return updates
}
