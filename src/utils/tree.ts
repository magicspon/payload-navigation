import type { ID } from '../types'

export type TreeLike<T = unknown> = {
  children?: TreeLike<T>[]
  id: ID
}

function eqId(a: ID, b: ID): boolean {
  return String(a) === String(b)
}

export const tree = {
  remove<T extends TreeLike<T>>(data: T[], id: ID): T[] {
    return data
      .filter((item) => !eqId(item.id, id))
      .map((item) => {
        if (!tree.hasChildren(item)) {
          return item
        }
        return { ...item, children: tree.remove((item.children || []) as T[], id) } as T
      })
  },

  insertBefore<T extends TreeLike<T>>(data: T[], targetId: ID, newItem: T): T[] {
    return data.flatMap((item) => {
      if (eqId(item.id, targetId)) {
        return [newItem, item]
      }
      if (!tree.hasChildren(item)) {
        return item
      }
      return {
        ...item,
        children: tree.insertBefore((item.children || []) as T[], targetId, newItem),
      } as T
    })
  },

  insertAfter<T extends TreeLike<T>>(data: T[], targetId: ID, newItem: T): T[] {
    return data.flatMap((item) => {
      if (eqId(item.id, targetId)) {
        return [item, newItem]
      }
      if (!tree.hasChildren(item)) {
        return item
      }
      return {
        ...item,
        children: tree.insertAfter((item.children || []) as T[], targetId, newItem),
      } as T
    })
  },

  insertChild<T extends TreeLike<T>>(data: T[], targetId: ID, newItem: T): T[] {
    return data.flatMap((item) => {
      if (eqId(item.id, targetId)) {
        return { ...item, children: [newItem, ...((item.children || []) as T[])] } as T
      }
      if (!tree.hasChildren(item)) {
        return item
      }
      return {
        ...item,
        children: tree.insertChild((item.children || []) as T[], targetId, newItem),
      } as T
    })
  },

  find<T extends TreeLike<T>>(data: T[], itemId: ID): T | undefined {
    for (const item of data) {
      if (eqId(item.id, itemId)) {
        return item
      }
      if (tree.hasChildren(item)) {
        const result = tree.find((item.children || []) as T[], itemId)
        if (result) {
          return result
        }
      }
    }
  },

  findParent<T extends TreeLike<T>>(
    data: T[],
    itemId: ID,
    parent: T | null = null,
  ): T | null | undefined {
    for (const item of data) {
      if (eqId(item.id, itemId)) {
        return parent
      }
      if (tree.hasChildren(item)) {
        const result = tree.findParent((item.children || []) as T[], itemId, item)
        if (result !== undefined) {
          return result
        }
      }
    }
    return undefined
  },

  hasChildren<T extends TreeLike<T>>(item: T): boolean {
    return (item.children?.length ?? 0) > 0
  },
}
