'use client'
import { toast, XIcon } from '@payloadcms/ui'
import * as React from 'react'
import type { ID } from '../../types'

type Props = {
  apiBase: string
  id: ID
  onDeleted: () => void
}

const btnStyle: React.CSSProperties = {
  alignItems: 'center',
  background: 'transparent',
  border: 0,
  color: 'var(--theme-elevation-700)',
  cursor: 'pointer',
  display: 'flex',
  padding: '0.25rem',
}

export function DeleteMenuItem({ id, apiBase, onDeleted }: Props) {
  const [confirming, setConfirming] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/menu_item/${id}`, {
        credentials: 'include',
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Failed to delete')
      }
      onDeleted()
      toast.success('Item deleted')
    } catch {
      toast.error('Failed to delete item')
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div style={{ alignItems: 'center', display: 'flex', gap: '0.25rem' }}>
        <button
          disabled={loading}
          onClick={handleDelete}
          style={{ ...btnStyle, color: 'var(--color-error-500)', fontSize: '0.75rem' }}
          type="button"
        >
          {loading ? '…' : 'Delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          style={{ ...btnStyle, fontSize: '0.75rem' }}
          type="button"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirming(true)} style={btnStyle} title="Delete item" type="button">
      <XIcon />
    </button>
  )
}
