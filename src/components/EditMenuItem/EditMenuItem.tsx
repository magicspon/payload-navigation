'use client'
import { EditIcon, toast, useConfig, XIcon, Button } from '@payloadcms/ui'
import * as React from 'react'

import type { FormData, Item, MenuItemType } from '../../types'

import { CustomField } from '../fields/CustomField'
import { InternalField } from '../fields/InternalField'
import { MenuType } from '../fields/MenuType'
import { ParentField } from '../fields/ParentField'
import { PassiveField } from '../fields/PassiveField'
import { TitleInput } from '../fields/TitleInput'
import { UrlField } from '../fields/UrlField'

type Props = {
  handle: string
  internalCollections: string[]
  onUpdated: (docs: unknown[]) => void
} & Item

const overlayStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.6)',
  inset: 0,
  position: 'fixed',
  zIndex: 1000,
}

const drawerStyle: React.CSSProperties = {
  background: 'var(--color-base-900)',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  height: '100%',
  maxWidth: '100vw',
  overflowY: 'auto',
  padding: '1.5rem',
  position: 'fixed',
  right: 0,
  top: 0,
  width: '360px',
  zIndex: 1001,
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

export function EditMenuItem({ id, type, custom, handle, internal, internalCollections, onUpdated, parent, passive, title, url }: Props) {
  const { config } = useConfig()
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const parentId = typeof parent === 'object' && parent !== null ? (parent as { id: string }).id : (parent)
  const internalId = typeof internal?.value === 'object' && internal?.value !== null
    ? (internal.value as { id: string }).id
    : (internal?.value as string | undefined)

  const [formData, setFormData] = React.useState<FormData>({
    type: (type as MenuItemType) ?? 'url',
    custom: custom ?? '',
    internal: internalId ?? '',
    parent: parentId ?? null,
    passive: passive ?? '',
    relationTo: internal?.relationTo ?? internalCollections[0] ?? '',
    title: title ?? '',
    url: url ?? '',
  })

  const apiBase = `${config.serverURL}${config.routes.api}/navigation-plugin`

  const handleSave = async () => {
    if (!formData.title) {return}
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        type: formData.type,
        handle,
        parent: formData.parent ?? null,
        title: formData.title,
      }
      if (formData.type === 'url') {body.url = formData.url}
      if (formData.type === 'internal') { body.internal = formData.internal; body.relationTo = formData.relationTo }
      if (formData.type === 'custom') {body.custom = formData.custom}
      if (formData.type === 'passive') {body.passive = formData.passive}

      const res = await fetch(`${apiBase}/items/${id}`, {
        body: JSON.stringify(body),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      })
      if (!res.ok) {throw new Error('Failed to update')}
      const data = await res.json()
      onUpdated(data)
      toast.success('Menu item updated')
      setOpen(false)
    } catch {
      toast.error('Failed to update menu item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={btnStyle} title="Edit item" type="button">
        <EditIcon />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} role="presentation" style={overlayStyle} />
          <div style={drawerStyle}>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ color: 'var(--color-base-0)', margin: 0 }}>Edit Menu Item</h3>
              <button onClick={() => setOpen(false)} style={btnStyle} type="button">
                <XIcon />
              </button>
            </div>

            <TitleInput onChange={(v) => setFormData({ ...formData, title: v })} value={formData.title} />
            <MenuType
              internalCollections={internalCollections}
              onChange={(v) => setFormData({ ...formData, type: v })}
              value={formData.type}
            />

            {formData.type === 'url' && (
              <UrlField onChange={(v) => setFormData({ ...formData, url: v })} value={formData.url} />
            )}
            {formData.type === 'internal' && internalCollections.length > 0 && (
              <InternalField
                internalCollections={internalCollections}
                onChange={(v) => setFormData({ ...formData, internal: v?.value ?? '', relationTo: v?.relationTo ?? '' })}
                value={formData.internal ? { relationTo: formData.relationTo ?? '', value: formData.internal } : null}
              />
            )}
            {formData.type === 'custom' && (
              <CustomField onChange={(v) => setFormData({ ...formData, custom: v })} value={formData.custom} />
            )}
            {formData.type === 'passive' && (
              <PassiveField onChange={(v) => setFormData({ ...formData, passive: v })} value={formData.passive} />
            )}

            <ParentField
              excludeId={id}
              navigationHandle={handle}
              onChange={(v) => setFormData({ ...formData, parent: v })}
              value={formData.parent}
            />

            <Button
              disabled={loading || !formData.title}
              onClick={handleSave}
              type="button"
            >
              {loading ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </>
      )}
    </>
  )
}
