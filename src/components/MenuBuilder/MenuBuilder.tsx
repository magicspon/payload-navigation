'use client'
import { toast, useConfig, useField, Button } from '@payloadcms/ui'
import * as React from 'react'

import type { FormData, MenuItemType } from '../../types'

import { CustomField } from '../fields/CustomField'
import { InternalField } from '../fields/InternalField'
import { MenuType } from '../fields/MenuType'
import { ParentField } from '../fields/ParentField'
import { PassiveField } from '../fields/PassiveField'
import { TitleInput } from '../fields/TitleInput'
import { UrlField } from '../fields/UrlField'

type Props = {
  internalCollections?: string[]
  maxDepth?: number
}

const defaultForm: FormData = {
  type: 'url',
  custom: '',
  internal: '',
  parent: null,
  passive: '',
  relationTo: '',
  title: '',
  url: '',
}

export function MenuBuilder({ internalCollections = [], maxDepth: _maxDepth = 3 }: Props) {
  const { value: navigationHandle } = useField<string>({ path: 'handle' })
  const { config } = useConfig()
  const [formData, setFormData] = React.useState<FormData>(defaultForm)
  const [loading, setLoading] = React.useState(false)

  const apiBase = `${config.serverURL}${config.routes.api}/navigation-plugin`

  const handleAdd = async () => {
    if (!navigationHandle || !formData.title) {return}
    setLoading(true)

    try {
      const body: Record<string, unknown> = {
        type: formData.type,
        handle: navigationHandle,
        parent: formData.parent ?? undefined,
        title: formData.title,
      }

      if (formData.type === 'url') {
        if (!formData.url) { toast.error('URL is required'); setLoading(false); return }
        body.url = formData.url
      } else if (formData.type === 'internal') {
        if (!formData.internal) { toast.error('Please select a page'); setLoading(false); return }
        body.internal = formData.internal
        body.relationTo = formData.relationTo
      } else if (formData.type === 'custom') {
        if (!formData.custom) { toast.error('Custom value is required'); setLoading(false); return }
        body.custom = formData.custom
      } else if (formData.type === 'passive') {
        if (!formData.passive) { toast.error('Passive label is required'); setLoading(false); return }
        body.passive = formData.passive
      }

      const res = await fetch(`${apiBase}/items`, {
        body: JSON.stringify(body),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as Record<string, string>).message ?? 'Failed to create')
      }

      setFormData(defaultForm)
      toast.success('Menu item added')
      window.dispatchEvent(new CustomEvent('nav:items-changed'))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create menu item'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h4 style={{ color: 'var(--color-base-0)', fontSize: '0.875rem', margin: 0 }}>Add Menu Item</h4>

      <TitleInput onChange={(v) => setFormData({ ...formData, title: v })} value={formData.title} />
      <MenuType
        internalCollections={internalCollections}
        onChange={(v: MenuItemType) => setFormData({ ...formData, type: v })}
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
        navigationHandle={navigationHandle}
        onChange={(v) => setFormData({ ...formData, parent: v })}
        value={formData.parent}
      />

      <Button
        disabled={loading || !formData.title}
        onClick={handleAdd}
        type="button"
      >
        {loading ? 'Adding…' : 'Add item'}
      </Button>
    </div>
  )
}
