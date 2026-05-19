import type { Menu } from '../types'

import { tree } from './tree'

export function isDescendant(sourceId: string, targetId: string, data: Menu[]): boolean {
  const source = tree.find(data, sourceId)
  if (!source) {return false}
  return !!tree.find(source.children ?? [], targetId)
}
