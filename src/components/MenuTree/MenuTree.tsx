'use client'

import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { toast, useConfig, useField, Button } from '@payloadcms/ui'
import * as React from 'react'

import type { NavigationMenuItem, Item, Menu } from '../../types'

import { calculateUpdates } from '../../utils/calculateUpdates'
import { createCleanTree, createTree } from '../../utils/createTree'
import { isDescendant } from '../../utils/isDescendant'
import { tree } from '../../utils/tree'
import { TreeItem } from '../TreeItem/TreeItem'

type Props = {
  internalCollections?: string[]
  maxDepth?: number
}

export function MenuTree({ internalCollections = [], maxDepth: _maxDepth = 3 }: Props) {
  const { value: navigationHandle } = useField<string>({ path: 'handle' })
  const { setValue: setJsonData } = useField<NavigationMenuItem[]>({ path: 'items' })
  const { config } = useConfig()

  const [localTree, setLocalTree] = React.useState<Menu[]>([])
  const [originalDocs, setOriginalDocs] = React.useState<Item[]>([])
  const [hasChanges, setHasChanges] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const apiBase = `${config.serverURL}${config.routes.api}/navigation-plugin`

  const fetchItems = React.useCallback(async () => {
    if (!navigationHandle) { return }
    const res = await fetch(`${apiBase}/items?handle=${encodeURIComponent(navigationHandle)}`, {
      credentials: 'include',
    })
    if (!res.ok) { return }
    const docs: Item[] = await res.json()
    setOriginalDocs(docs)
    setLocalTree(createTree(docs))
    setHasChanges(false)
  }, [navigationHandle, apiBase])

  React.useEffect(() => {
    void fetchItems()
  }, [fetchItems])

  React.useEffect(() => {
    const handler = () => { void fetchItems() }
    window.addEventListener('nav:items-changed', handler)
    return () => window.removeEventListener('nav:items-changed', handler)
  }, [fetchItems])

  const handleDrop = React.useCallback(
    (where: 'before' | 'after' | 'inside', sourceId: string, targetId: string) => {
      setLocalTree((prev) => {
        if (isDescendant(sourceId, targetId, prev)) { return prev }
        const sourceItem = tree.find(prev, sourceId)
        if (!sourceItem) { return prev }

        // Dropping on own parent in the middle zone → unnest 1 level
        if (where === 'inside') {
          const parent = tree.findParent(prev, sourceId)
          if (parent && parent.id === targetId) {
            let result = tree.remove(prev, sourceId)
            result = tree.insertAfter(result, targetId, sourceItem)
            return result
          }
        }

        let result = tree.remove(prev, sourceId)
        if (where === 'inside') {
          result = tree.insertChild(result, targetId, sourceItem)
        } else if (where === 'before') {
          result = tree.insertBefore(result, targetId, sourceItem)
        } else {
          result = tree.insertAfter(result, targetId, sourceItem)
        }
        return result
      })
      setHasChanges(true)
    },
    [],
  )

  const handleUnnest = React.useCallback((sourceId: string, levelsUp: number) => {
    setLocalTree((prev) => {
      const sourceItem = tree.find(prev, sourceId)
      if (!sourceItem) { return prev }

      // Walk up the parent chain levelsUp times to find the ancestor to insert after
      let currentId = sourceId
      let ancestor: Menu | null | undefined
      for (let i = 0; i < levelsUp; i++) {
        ancestor = tree.findParent(prev, currentId)
        if (!ancestor) { break }
        currentId = ancestor.id
      }
      if (!ancestor) { return prev }

      let result = tree.remove(prev, sourceId)
      result = tree.insertAfter(result, ancestor.id, sourceItem)
      return result
    })
    setHasChanges(true)
  }, [])

  React.useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        const target = location.current.dropTargets[0]
        if (!target) { return }

        const sourceId = String(source.data.id)
        const targetId = String((target.data as { id: string }).id)

        // Self-drop with unnest gesture
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

  const handleSave = async () => {
    if (!navigationHandle || !hasChanges) { return }
    setSaving(true)
    try {
      const updates = calculateUpdates(localTree, originalDocs)
      if (updates.length === 0) { setHasChanges(false); return }

      const res = await fetch(`${apiBase}/reorder`, {
        body: JSON.stringify({ handle: navigationHandle, updates }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) { throw new Error() }
      const docs: Item[] = await res.json()
      setOriginalDocs(docs)
      setLocalTree(createTree(docs))
      setJsonData(createCleanTree(docs))
      setHasChanges(false)
      toast.success('Navigation order updated')
    } catch {
      toast.error('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleDocsChange = (docs: Item[]) => {
    setOriginalDocs(docs)
    setLocalTree(createTree(docs))
    setJsonData(createCleanTree(docs))
  }

  if (!navigationHandle) { return null }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        {localTree.map((item) => (
          <TreeItem
            handle={navigationHandle}
            internalCollections={internalCollections}
            item={item}
            key={item.id}
            level={0}
            onDeleted={handleDocsChange}
            onUpdated={handleDocsChange}
          />
        ))}
        {localTree.length === 0 && (
          <p style={{ color: 'var(--color-base-500)', fontSize: '0.875rem' }}>
            No menu items yet. Add one using the form in the sidebar.
          </p>
        )}
      </div>

      <Button
        disabled={!hasChanges || saving}
        onClick={handleSave}
        type="button"
      >
        {saving ? 'Saving…' : 'Save order'}
      </Button>
    </div>
  )
}
