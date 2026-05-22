'use client'

import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { useConfig, useField } from '@payloadcms/ui'
import * as React from 'react'

import type { Item, Menu } from '../../types'

import { createTree, normalizeDepths } from '../../utils/createTree'
import { isDescendant } from '../../utils/isDescendant'
import { tree } from '../../utils/tree'
import { TreeItem } from '../TreeItem/TreeItem'

type Props = {
  initialDocs: Item[]
  internalCollections?: string[]
  maxDepth?: number
  navigationHandle: string
}

export function MenuTreeClient({ initialDocs, internalCollections = [], navigationHandle }: Props) {
  const { value: items, setValue: setJsonData } = useField<Menu[]>({ path: 'items' })

  const itemsRef = React.useRef(items)
  React.useEffect(() => {
    itemsRef.current = items
  }, [items])

  React.useEffect(() => {
    setJsonData(createTree(initialDocs))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrop = React.useCallback(
    (where: 'before' | 'after' | 'inside', sourceId: string, targetId: string) => {
      const current = itemsRef.current
      if (isDescendant(sourceId, targetId, current)) return
      const sourceItem = tree.find(current, sourceId)
      if (!sourceItem) return

      if (where === 'inside') {
        const parent = tree.findParent(current, sourceId)
        if (parent && parent.id === targetId) {
          let result = tree.remove(current, sourceId)
          result = tree.insertAfter(result, targetId, sourceItem)
          setJsonData(normalizeDepths(result))
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
      setJsonData(normalizeDepths(result))
    },
    [setJsonData],
  )

  const handleMove = React.useCallback(
    (id: string, direction: 'down' | 'up') => {
      const current = itemsRef.current
      const parent = tree.findParent(current, id)
      const siblings = parent ? (parent.children ?? []) : current
      const idx = siblings.findIndex((s) => s.id === id)
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
      setJsonData(normalizeDepths(result))
    },
    [setJsonData],
  )

  const handleUnnest = React.useCallback(
    (sourceId: string, levelsUp: number) => {
      const current = itemsRef.current
      const sourceItem = tree.find(current, sourceId)
      if (!sourceItem) return

      let currentId = sourceId
      let ancestor: Menu | null | undefined
      for (let i = 0; i < levelsUp; i++) {
        ancestor = tree.findParent(current, currentId)
        if (!ancestor) break
        currentId = ancestor.id
      }
      if (!ancestor) return

      let result = tree.remove(current, sourceId)
      result = tree.insertAfter(result, ancestor.id, sourceItem)
      setJsonData(normalizeDepths(result))
    },
    [setJsonData],
  )

  React.useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0]
        if (!target) return

        const sourceId = String(source.data.id)
        const targetId = String((target.data as { id: string }).id)

        if (sourceId === targetId) {
          const data = target.data as { unnest?: boolean; levelsUp?: number }
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

  const handleItemMutated = React.useCallback(
    (newTree: Menu[], newDocs: Item[]) => {
      setJsonData(newTree)
    },
    [setJsonData],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        {items?.map((item, idx) => (
          <TreeItem
            handle={navigationHandle}
            internalCollections={internalCollections}
            isFirst={idx === 0}
            isLast={idx === (items?.length ?? 0) - 1}
            item={item}
            key={item.id}
            level={0}
            onDeleted={handleItemMutated}
            onMove={handleMove}
            onUpdated={handleItemMutated}
          />
        ))}
        {(!items || items.length === 0) && (
          <p style={{ color: 'var(--theme-elevation-500)', fontSize: '0.875rem' }}>
            No menu items yet. Add one using the form in the sidebar.
          </p>
        )}
      </div>
    </div>
  )
}
