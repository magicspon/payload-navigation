'use client'

import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { toast, useConfig, Button, Banner } from '@payloadcms/ui'
import { stringify } from 'qs-esm'
import * as React from 'react'

import type { ID, Item, Menu } from '../../types'

import { calculateUpdates } from '../../utils/calculateUpdates'

import { coerceId } from '../../utils/coerceId'
import { createTree, exceedsMaxDepth, normalizeDepths } from '../../utils/createTree'
import { isDescendant } from '../../utils/isDescendant'
import { tree } from '../../utils/tree'
import { TreeItem } from '../TreeItem/TreeItem'

type Props = {
  initialDocs: Item[]
  internalCollections?: string[]
  maxDepth?: number
  navigationId: ID
}

export function MenuTreeClient({ initialDocs, maxDepth = 3, navigationId }: Props) {
  const { config } = useConfig()
  const apiBase = `${config.serverURL}${config.routes.api}`

  const [items, setItems] = React.useState<Menu[]>(() => createTree(initialDocs))
  const [originalDocs, setOriginalDocs] = React.useState<Item[]>(initialDocs)
  const [adding, setAdding] = React.useState(false)
  const [pendingOpenId, setPendingOpenId] = React.useState<ID | null>(null)

  const itemsRef = React.useRef(items)
  React.useEffect(() => {
    itemsRef.current = items
  }, [items])

  const originalDocsRef = React.useRef(originalDocs)
  React.useEffect(() => {
    originalDocsRef.current = originalDocs
  }, [originalDocs])

  const refresh = React.useCallback(async () => {
    const query = stringify({
      depth: 0,
      limit: 0,
      sort: '_order',
      where: { navigation: { equals: navigationId } },
    })
    const res = await fetch(`${apiBase}/menu_item?${query}`, { credentials: 'include' })
    if (!res.ok) return
    const data = await res.json()
    const docs = data.docs as Item[]
    setItems(createTree(docs))
    setOriginalDocs(docs)
  }, [apiBase, navigationId])

  const patchItem = React.useCallback(
    async (update: { _order: string; id: ID; parent: null | ID }) => {
      const res = await fetch(`${apiBase}/menu_item/${update.id}`, {
        body: JSON.stringify({ _order: update._order, parent: coerceId(update.parent) }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      if (!res.ok) throw new Error(`Failed to update item ${update.id}`)
    },
    [apiBase],
  )

  const applyReorder = React.useCallback(
    async (newTree: Menu[]) => {
      const updates = calculateUpdates(newTree, originalDocsRef.current)
      if (updates.length === 0) return
      try {
        // Apply sequentially in parent-before-child order so each item's depth is
        // recomputed from an already-persisted parent (calculateUpdates emits parents first).
        for (const update of updates) {
          await patchItem(update)
        }
        toast.success('Order saved')
      } catch {
        toast.error('Failed to save new order')
      }
      await refresh()
    },
    [patchItem, refresh],
  )

  const commit = React.useCallback(
    (newTree: Menu[]) => {
      if (exceedsMaxDepth(newTree, maxDepth)) {
        toast.error(`Maximum nesting depth of ${maxDepth} reached`)
        return
      }
      setItems(newTree)
      void applyReorder(newTree)
    },
    [applyReorder, maxDepth],
  )

  const handleDrop = React.useCallback(
    (where: 'after' | 'before' | 'inside', sourceId: ID, targetId: ID) => {
      const current = itemsRef.current
      if (isDescendant(sourceId, targetId, current)) return
      const sourceItem = tree.find(current, sourceId)
      if (!sourceItem) return

      if (where === 'inside') {
        const parent = tree.findParent(current, sourceId)
        if (parent && parent.id === targetId) {
          let result = tree.remove(current, sourceId)
          result = tree.insertAfter(result, targetId, sourceItem)
          commit(normalizeDepths(result))
          return
        }
      }

      let result = tree.remove(current, sourceId)
      if (where === 'inside') {
        result = tree.insertChild(result, targetId, sourceItem)
      } else if (where === 'before') {
        result = tree.insertBefore(result, targetId, sourceItem)
      } else {
        result = tree.insertAfter(result, targetId, sourceItem)
      }
      commit(normalizeDepths(result))
    },
    [commit],
  )

  const handleMove = React.useCallback(
    (id: ID, direction: 'down' | 'up') => {
      const current = itemsRef.current
      const parent = tree.findParent(current, id)
      const siblings = parent ? (parent.children ?? []) : current
      const idx = siblings.findIndex((s) => String(s.id) === String(id))
      if (idx === -1) return

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= siblings.length) return

      const targetId = siblings[targetIdx].id
      const sourceItem = tree.find(current, id)
      if (!sourceItem) return

      let result = tree.remove(current, id)
      result =
        direction === 'up'
          ? tree.insertBefore(result, targetId, sourceItem)
          : tree.insertAfter(result, targetId, sourceItem)
      commit(normalizeDepths(result))
    },
    [commit],
  )

  const handleUnnest = React.useCallback(
    (sourceId: ID, levelsUp: number) => {
      const current = itemsRef.current
      const sourceItem = tree.find(current, sourceId)
      if (!sourceItem) return

      let currentId: ID = sourceId
      let ancestor: Menu | null | undefined
      for (let i = 0; i < levelsUp; i++) {
        ancestor = tree.findParent(current, currentId)
        if (!ancestor) break
        currentId = ancestor.id
      }
      if (!ancestor) return

      let result = tree.remove(current, sourceId)
      result = tree.insertAfter(result, ancestor.id, sourceItem)
      commit(normalizeDepths(result))
    },
    [commit],
  )

  React.useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0]
        if (!target) return

        const sourceId = String(source.data.id)
        const targetId = String((target.data as { id: string }).id)

        if (sourceId === targetId) {
          const data = target.data as { levelsUp?: number; unnest?: boolean }
          if (data.unnest && data.levelsUp) {
            handleUnnest(sourceId, data.levelsUp)
          }
          return
        }

        const closestEdge = extractClosestEdge(target.data)
        if (closestEdge === 'top') {
          handleDrop('before', sourceId, targetId)
        } else if (closestEdge === 'bottom') {
          handleDrop('after', sourceId, targetId)
        } else {
          handleDrop('inside', sourceId, targetId)
        }
      },
    })
  }, [handleDrop, handleUnnest])

  const handleAdd = React.useCallback(async () => {
    setAdding(true)
    try {
      const res = await fetch(`${apiBase}/menu_item`, {
        body: JSON.stringify({
          navigation: coerceId(navigationId),
          title: 'New item',
          type: 'url',
          url: '#',
        }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) {
        toast.error('Failed to add item')
        return
      }
      const data = await res.json()
      const newId: ID | undefined = data.doc?.id
      await refresh()
      if (newId) setPendingOpenId(newId)
    } catch {
      toast.error('Failed to add item')
    } finally {
      setAdding(false)
    }
  }, [apiBase, navigationId, refresh])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        {items.map((item, idx) => (
          <TreeItem
            apiBase={apiBase}
            autoOpen={pendingOpenId !== null && String(item.id) === String(pendingOpenId)}
            isFirst={idx === 0}
            isLast={idx === items.length - 1}
            item={item}
            key={item.id}
            level={0}
            onAutoOpened={() => setPendingOpenId(null)}
            onMove={handleMove}
            onRefresh={refresh}
          />
        ))}
        {items.length === 0 && <Banner type="error">No menu items yet.</Banner>}
      </div>
      <div>
        <Button disabled={adding} onClick={handleAdd} type="button">
          {adding ? 'Adding…' : '+ Add item'}
        </Button>
      </div>
    </div>
  )
}
