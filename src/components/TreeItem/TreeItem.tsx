'use client'

import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import {
  ChevronIcon,
  DragHandleIcon,
  EditIcon,
  PlusIcon,
  toast,
  useDocumentDrawer,
} from '@payloadcms/ui'
import * as React from 'react'

import type { ID, Menu } from '../../types'

import { DeleteMenuItem } from '../DeleteMenuItem/DeleteMenuItem'

type Props = {
  apiBase: string
  autoOpen?: boolean
  isFirst: boolean
  isLast: boolean
  item: Menu
  level: number
  onAutoOpened?: () => void
  onMove: (id: ID, direction: 'down' | 'up') => void
  onRefresh: () => void
}

export function TreeItem({
  apiBase,
  autoOpen,
  isFirst,
  isLast,
  item,
  level,
  onAutoOpened,
  onMove,
  onRefresh,
}: Props) {
  const rowRef = React.useRef<HTMLDivElement>(null)
  const dragHandleRef = React.useRef<HTMLSpanElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [closestEdge, setClosestEdge] = React.useState<Edge | 'inside' | 'unnest' | null>(null)
  const [collapsed, setCollapsed] = React.useState<boolean>(item.collapsed ?? false)

  const [DocumentDrawer, , { closeDrawer, openDrawer }] = useDocumentDrawer({
    id: String(item.id),
    collectionSlug: 'menu_item',
  })

  const autoOpenFired = React.useRef(false)
  React.useEffect(() => {
    if (autoOpen && !autoOpenFired.current) {
      autoOpenFired.current = true
      openDrawer()
      onAutoOpened?.()
    }
  }, [autoOpen, openDrawer, onAutoOpened])

  React.useEffect(() => {
    setCollapsed(item.collapsed ?? false)
  }, [item.id, item.collapsed])

  const hasChildren = (item.children?.length ?? 0) > 0

  React.useEffect(() => {
    const row = rowRef.current
    const dragHandle = dragHandleRef.current
    if (!row || !dragHandle) return

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

        if (source.data.id === String(item.id)) {
          if (level > 0) {
            const INDENT_PX = 24
            const BASE_PX = 8
            const desiredLevel = Math.max(
              0,
              Math.floor((input.clientX - rect.left - BASE_PX) / INDENT_PX),
            )
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
  }, [item.id, level])

  const handleToggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    fetch(`${apiBase}/menu_item/${item.id}`, {
      body: JSON.stringify({ collapsed: next }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    }).catch(() => {
      setCollapsed(!next)
      toast.error('Failed to save')
    })
  }

  return (
    <div
      data-testid="tree-item"
      style={
        closestEdge === 'unnest'
          ? {
              borderRadius: '4px',
              outline: '2px solid var(--color-warning-500)',
              outlineOffset: '1px',
            }
          : undefined
      }
    >
      <div
        data-dnd-id={item.id}
        ref={rowRef}
        style={{
          alignItems: 'center',
          background: 'var(--theme-elevation-50)',
          border:
            closestEdge === 'inside'
              ? '1px solid var(--color-success-500)'
              : '1px solid var(--theme-elevation-150)',
          borderRadius: '4px',
          cursor: 'default',
          display: 'flex',
          marginBottom: '2px',
          opacity: isDragging ? 0.4 : 1,
          padding: '0.5rem',
          paddingLeft: `${0.5 + level * 1.75}rem`,
          position: 'relative',
        }}
      >
        <span
          ref={dragHandleRef}
          style={{
            color: 'var(--theme-elevation-500)',
            cursor: 'grab',
            display: 'grid',
            lineHeight: 1,
            placeItems: 'center',
            userSelect: 'none',
            width: 40,
          }}
          title="Drag to reorder"
        >
          <DragHandleIcon />
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ color: 'var(--theme-elevation-950)', fontSize: '0.875rem', fontWeight: 500 }}
          >
            {item.title}
          </div>
          {item.href && (
            <div
              style={{
                color: 'var(--theme-elevation-500)',
                fontSize: '0.75rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.href}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexShrink: 0, gap: '0.25rem' }}>
          {hasChildren && (
            <button
              aria-label={collapsed ? 'Expand' : 'Collapse'}
              onClick={handleToggleCollapse}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--theme-elevation-700)',
                cursor: 'pointer',
                display: 'grid',
                flexShrink: 0,
                fontSize: '0.625rem',
                lineHeight: 1,
                padding: '2px',
                placeItems: 'center',
                transition: 'transform 120ms ease',
                width: 26.5,
              }}
              type="button"
            >
              {collapsed ? (
                <PlusIcon />
              ) : (
                <span
                  style={{
                    backgroundColor: 'var(--theme-elevation-700)',
                    display: 'block',
                    height: 1,
                    width: 10,
                  }}
                />
              )}
            </button>
          )}
          <button
            aria-label="Move up"
            disabled={isFirst}
            onClick={() => onMove(String(item.id), 'up')}
            style={{
              background: 'none',
              border: 'none',
              color: isFirst ? 'var(--theme-elevation-300)' : 'var(--theme-elevation-600)',
              cursor: isFirst ? 'default' : 'pointer',
              fontSize: '0.75rem',
              lineHeight: 1,
              padding: '2px 4px',
            }}
            type="button"
          >
            <ChevronIcon direction="up" />
          </button>
          <button
            aria-label="Move down"
            disabled={isLast}
            onClick={() => onMove(String(item.id), 'down')}
            style={{
              background: 'none',
              border: 'none',
              color: isLast ? 'var(--theme-elevation-300)' : 'var(--theme-elevation-600)',
              cursor: isLast ? 'default' : 'pointer',
              fontSize: '0.75rem',
              lineHeight: 1,
              padding: '2px 4px',
            }}
            type="button"
          >
            <ChevronIcon />
          </button>
          <button
            onClick={openDrawer}
            style={{
              alignItems: 'center',
              background: 'transparent',
              border: 0,
              color: 'var(--theme-elevation-700)',
              cursor: 'pointer',
              display: 'flex',
              padding: '0.25rem',
            }}
            title="Edit item"
            type="button"
          >
            <EditIcon />
          </button>
          <DeleteMenuItem apiBase={apiBase} id={String(item.id)} onDeleted={onRefresh} />
        </div>

        {closestEdge === 'top' && <DropIndicator edge="top" />}
        {closestEdge === 'bottom' && <DropIndicator edge="bottom" />}
      </div>

      <DocumentDrawer
        onSave={() => {
          closeDrawer()
          onRefresh()
        }}
      />

      {!collapsed &&
        item.children?.map((child, idx) => (
          <TreeItem
            apiBase={apiBase}
            isFirst={idx === 0}
            isLast={idx === (item.children?.length ?? 0) - 1}
            item={child}
            key={child.id}
            level={level + 1}
            onMove={onMove}
            onRefresh={onRefresh}
          />
        ))}
    </div>
  )
}
