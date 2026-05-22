'use client'

import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import * as React from 'react'

import type { Item, Menu } from '../../types'

import { DeleteMenuItem } from '../DeleteMenuItem/DeleteMenuItem'
import { EditMenuItem } from '../EditMenuItem/EditMenuItem'

type Props = {
  handle: string
  internalCollections: string[]
  item: Menu
  level: number
  onDeleted: (docs: Item[]) => void
  onUpdated: (docs: Item[]) => void
}

export function TreeItem({ handle, internalCollections, item, level, onDeleted, onUpdated }: Props) {
  const rowRef = React.useRef<HTMLDivElement>(null)
  const dragHandleRef = React.useRef<HTMLSpanElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [closestEdge, setClosestEdge] = React.useState<Edge | 'inside' | 'unnest' | null>(null)

  React.useEffect(() => {
    const row = rowRef.current
    const dragHandle = dragHandleRef.current
    if (!row || !dragHandle) { return }

    const cleanupDraggable = draggable({
      element: row,
      dragHandle,
      getInitialData: () => ({ id: String(item.id) }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    })

    const cleanupDrop = dropTargetForElements({
      element: row,
      canDrop: () => true,
      getData: ({ input, element, source }) => {
        const rect = element.getBoundingClientRect()
        const data = { id: String(item.id) }

        // Self-drag: detect leftward gesture to unnest by N levels
        if (source.data.id === String(item.id)) {
          if (level > 0) {
            const INDENT_PX = 24  // 1.5rem at 16px/rem
            const BASE_PX = 8    // 0.5rem base padding
            const desiredLevel = Math.max(0, Math.floor((input.clientX - rect.left - BASE_PX) / INDENT_PX))
            const levelsUp = level - desiredLevel
            if (levelsUp > 0) {
              return { ...data, unnest: true, levelsUp }
            }
          }
          return data
        }

        const quarter = rect.height / 4
        if (input.clientY < rect.top + quarter) {
          return attachClosestEdge(data, { input, element, allowedEdges: ['top'] })
        }
        if (input.clientY > rect.bottom - quarter) {
          return attachClosestEdge(data, { input, element, allowedEdges: ['bottom'] })
        }
        return data
      },
      onDrag: ({ self, source }) => {
        if (source.data.id === String(item.id)) {
          setClosestEdge((self.data as { unnest?: boolean }).unnest ? 'unnest' : null)
          return
        }
        setClosestEdge(extractClosestEdge(self.data) ?? 'inside')
      },
      onDragEnter: ({ self, source }) => {
        if (source.data.id === String(item.id)) {
          setClosestEdge((self.data as { unnest?: boolean }).unnest ? 'unnest' : null)
          return
        }
        setClosestEdge(extractClosestEdge(self.data) ?? 'inside')
      },
      onDragLeave: () => setClosestEdge(null),
      onDrop: () => setClosestEdge(null),
    })

    return () => {
      cleanupDraggable()
      cleanupDrop()
    }
  }, [item.id])

  return (
    <div
      data-testid="tree-item"
      style={closestEdge === 'unnest' ? {
        borderRadius: '4px',
        outline: '2px solid var(--color-warning-500)',
        outlineOffset: '1px',
      } : undefined}
    >
      <div
        data-dnd-id={item.id}
        ref={rowRef}
        style={{
          alignItems: 'center',
          background: 'var(--color-base-850)',
          border: closestEdge === 'inside' ? '1px solid var(--color-success-500)' : '1px solid var(--color-base-700)',
          borderRadius: '4px',
          cursor: 'default',
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2px',
          opacity: isDragging ? 0.4 : 1,
          padding: '0.5rem',
          paddingLeft: `${0.5 + level * 1.5}rem`,
          position: 'relative',
        }}
      >
        <span
          ref={dragHandleRef}
          style={{ color: 'var(--color-base-500)', cursor: 'grab', lineHeight: 1, userSelect: 'none' }}
          title="Drag to reorder"
        >
          ⣿
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--color-base-0)', fontSize: '0.875rem', fontWeight: 500 }}>
            {item.title}
          </div>
          {item.value && (
            <div style={{ color: 'var(--color-base-500)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.value}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexShrink: 0, gap: '0.25rem' }}>
          <EditMenuItem
            {...item}
            handle={handle}
            internalCollections={internalCollections}
            onUpdated={(docs) => onUpdated(docs as Item[])}
          />
          <DeleteMenuItem
            handle={handle}
            id={String(item.id)}
            onDeleted={(docs) => onDeleted(docs as Item[])}
          />
        </div>

        {closestEdge === 'top' && <DropIndicator edge="top" />}
        {closestEdge === 'bottom' && <DropIndicator edge="bottom" />}
      </div>

      {item.children?.map((child) => (
        <TreeItem
          handle={handle}
          internalCollections={internalCollections}
          item={child}
          key={child.id}
          level={level + 1}
          onDeleted={onDeleted}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  )
}
