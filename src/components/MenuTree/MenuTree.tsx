'use client'
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { toast, useConfig, useField, Button } from '@payloadcms/ui'
import * as React from 'react'

import type { NavigationMenuItem, Item, Menu } from '../../types'

import { calculateUpdates } from '../../utils/calculateUpdates'
import { createCleanTree, createTree } from '../../utils/createTree'
import { isDescendant } from '../../utils/isDescendant'
import { tree } from '../../utils/tree'
import { TreeItem } from '../TreeItem/TreeItem'

type DropPosition = 'after' | 'before' | 'inside'
type DropTarget = { id: string; position: DropPosition } | null

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
  const [dropTarget, setDropTarget] = React.useState<DropTarget>(null)
  const mouseYRef = React.useRef(0)

  const apiBase = `${config.serverURL}${config.routes.api}/navigation-plugin`

  const fetchItems = React.useCallback(async () => {
    if (!navigationHandle) {return}
    const res = await fetch(`${apiBase}/items?handle=${encodeURIComponent(navigationHandle)}`, {
      credentials: 'include',
    })
    if (!res.ok) {return}
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

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => { mouseYRef.current = e.clientY }
    document.addEventListener('mousemove', onMove)
    return () => document.removeEventListener('mousemove', onMove)
  }, [])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  const getDropPosition = (targetId: string): DropPosition => {
    const el = document.querySelector(`[data-dnd-id="${targetId}"]`)
    if (!el) {return 'after'}
    const rect = el.getBoundingClientRect()
    const relY = (mouseYRef.current - rect.top) / rect.height
    if (relY < 0.25) {return 'before'}
    if (relY > 0.75) {return 'after'}
    return 'inside'
  }

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || active.id === over.id) { setDropTarget(null); return }
    const position = getDropPosition(over.id as string)
    setDropTarget({ id: over.id as string, position })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDropTarget(null)
    if (!over || active.id === over.id) {return}

    const sourceId = active.id as string
    const targetId = over.id as string
    const position = getDropPosition(targetId)

    setLocalTree((prev) => {
      if (isDescendant(sourceId, targetId, prev)) {return prev}
      const sourceItem = tree.find(prev, sourceId)
      if (!sourceItem) {return prev}
      let result = tree.remove(prev, sourceId)
      result =
        position === 'inside'
          ? tree.insertChild(result, targetId, sourceItem)
          : position === 'before'
            ? tree.insertBefore(result, targetId, sourceItem)
            : tree.insertAfter(result, targetId, sourceItem)
      return result
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!navigationHandle || !hasChanges) {return}
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
      if (!res.ok) {throw new Error()}
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

  if (!navigationHandle) {return null}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <DndContext onDragEnd={handleDragEnd} onDragOver={handleDragOver} sensors={sensors}>
        <div>
          {localTree.map((item) => (
            <TreeItem
              dropTarget={dropTarget}
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
      </DndContext>

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
