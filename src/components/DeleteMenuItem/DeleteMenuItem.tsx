'use client'
import { toast, useConfig, XIcon } from '@payloadcms/ui'
import * as React from 'react'

type Props = {
  handle: string
  id: string
  onDeleted: (docs: unknown[]) => void
}

const btnStyle: React.CSSProperties = {
  alignItems: 'center',
  background: 'transparent',
  border: 0,
  color: 'var(--color-base-400)',
  cursor: 'pointer',
  display: 'flex',
  padding: '0.25rem',
}

export function DeleteMenuItem({ id, handle, onDeleted }: Props) {
  const { config } = useConfig()
  const [confirming, setConfirming] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const apiBase = `${config.serverURL}${config.routes.api}/navigation-plugin`

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/items/${id}?handle=${encodeURIComponent(handle)}`, {
        credentials: 'include',
        method: 'DELETE',
      })
      if (!res.ok) {throw new Error('Failed to delete')}
      const data = await res.json()
      onDeleted(data)
      toast.success('Item deleted')
      window.dispatchEvent(new CustomEvent('nav:items-changed'))
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
    <button
      onClick={() => setConfirming(true)}
      style={btnStyle}
      title="Delete item"
      type="button"
    >
      <XIcon />
    </button>
  )
}
