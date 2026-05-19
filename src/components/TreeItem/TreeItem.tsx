'use client'

import { useDraggable, useDroppable } from '@dnd-kit/core'
import * as React from 'react'

import type { Item, Menu } from '../../types'

import { DeleteMenuItem } from '../DeleteMenuItem/DeleteMenuItem'
import { EditMenuItem } from '../EditMenuItem/EditMenuItem'

type DropPosition = 'after' | 'before' | 'inside'

type Props = {
  dropTarget: { id: string; position: DropPosition } | null
  handle: string
  internalCollections: string[]
  item: Menu
  level: number
  onDeleted: (docs: Item[]) => void
  onUpdated: (docs: Item[]) => void
}

export function TreeItem({ dropTarget, handle, internalCollections, item, level, onDeleted, onUpdated }: Props) {
  const { attributes, isDragging, listeners, setNodeRef: setDragRef } = useDraggable({
    id: item.id,
  })

  const { setNodeRef: setDropRef } = useDroppable({ id: item.id })

  const setRef = (el: HTMLDivElement | null) => {
    setDragRef(el)
    setDropRef(el)
  }

  const isTarget = dropTarget?.id === item.id
  const position = isTarget ? dropTarget?.position : null

  const rowStyle: React.CSSProperties = {
    alignItems: 'center',
    background: 'var(--color-base-850)',
    border: `1px solid ${isTarget && position === 'inside' ? 'var(--color-success-500)' : 'var(--color-base-700)'}`,
    borderRadius: '4px',
    cursor: 'default',
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '2px',
    opacity: isDragging ? 0.4 : 1,
    padding: '0.5rem',
    paddingLeft: `${0.5 + level * 1.5}rem`,
    position: 'relative',
  }

  const indicatorStyle: React.CSSProperties = {
    background: 'var(--color-success-500)',
    height: '2px',
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
  }

  return (
    <div data-testid="tree-item">
      {isTarget && position === 'before' && (
        <div style={{ height: '2px', marginBottom: '2px', position: 'relative' }}>
          <div style={indicatorStyle} />
        </div>
      )}

      <div data-dnd-id={item.id} ref={setRef} style={rowStyle}>
        <span
          {...attributes}
          {...listeners}
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
            id={item.id}
            onDeleted={(docs) => onDeleted(docs as Item[])}
          />
        </div>
      </div>

      {isTarget && position === 'after' && (
        <div style={{ height: '2px', marginBottom: '2px', marginTop: '2px', position: 'relative' }}>
          <div style={indicatorStyle} />
        </div>
      )}

      {item.children?.map((child) => (
        <TreeItem
          dropTarget={dropTarget}
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
