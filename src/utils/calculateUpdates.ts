import { generateKeyBetween } from 'payload/shared'

import type { Menu } from '../types'

type OriginalItem = {
  [key: string]: unknown
  _order?: null | string
  depth?: null | number
  id: string
  parent?: { id: string } | null | string
}

type UpdateItem = {
  _order: string
  depth: number
  id: string
  parent: null | string
}

export function calculateUpdates(newTree: Menu[], originalData: OriginalItem[]): UpdateItem[] {
  const originalMap = new Map(
    originalData.map((item) => {
      const parentId =
        typeof item.parent === 'string' ? item.parent : (item.parent?.id ?? null)
      return [item.id, { _order: item._order ?? '', depth: item.depth ?? 0, parent: parentId }]
    }),
  )

  const updates: UpdateItem[] = []

  function traverse(items: Menu[], parent: null | string, depth: number) {
    let previousOrder: null | string = null

    for (const item of items) {
      const newOrder = generateKeyBetween(previousOrder, null)
      previousOrder = newOrder

      const original = originalMap.get(item.id)
      if (
        original?._order !== newOrder ||
        original?.parent !== parent ||
        original?.depth !== depth
      ) {
        updates.push({ id: item.id, _order: newOrder, depth, parent })
      }

      if (item.children?.length) {
        traverse(item.children, item.id, depth + 1)
      }
    }
  }

  traverse(newTree, null, 0)
  return updates
}
