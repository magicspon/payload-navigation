import type { ID, Menu } from '../types'

import { tree } from './tree'

export function isDescendant(sourceId: ID, targetId: ID, data: Menu[]): boolean {
  const source = tree.find(data, sourceId)
  if (!source) {
    return false
  }
  return !!tree.find(source.children ?? [], targetId)
}
