'use client'
import type { OptionObject } from 'payload'

import { SelectInput, useConfig } from '@payloadcms/ui'
import * as React from 'react'

type ParentDoc = { depth: number; id: string; title: string }

type Props = {
  excludeId?: string
  navigationHandle: string | undefined
  onChange: (value: null | string) => void
  value: null | string | undefined
}

export function ParentField({ excludeId, navigationHandle, onChange, value }: Props) {
  const { config } = useConfig()
  const [options, setOptions] = React.useState<OptionObject[]>([])
  const [loading, setLoading] = React.useState(false)

  const fetchOptions = React.useCallback(() => {
    if (!navigationHandle) {return}
    setLoading(true)
    const params = new URLSearchParams({ handle: navigationHandle })
    if (excludeId) {params.set('excludeId', excludeId)}
    fetch(`${config.serverURL}${config.routes.api}/navigation-plugin/parent-options?${params}`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((docs: ParentDoc[]) => {
        setOptions(
          docs.map((d) => ({
            label: `${'›'.repeat(d.depth)}${d.depth > 0 ? ' ' : ''}${d.title}`,
            value: d.id,
          })),
        )
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [navigationHandle, excludeId, config.serverURL, config.routes.api])

  React.useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  React.useEffect(() => {
    window.addEventListener('nav:items-changed', fetchOptions)
    return () => window.removeEventListener('nav:items-changed', fetchOptions)
  }, [fetchOptions])

  return (
    <SelectInput
      isClearable
      label="Parent"
      name="nav-parent"
      onChange={(option) => {
        const opt = option as null | OptionObject
        onChange(opt?.value ?? null)
      }}
      options={options}
      path="nav-parent"
      placeholder="— None —"
      readOnly={loading || !navigationHandle}
      value={value ?? ''}
    />
  )
}
