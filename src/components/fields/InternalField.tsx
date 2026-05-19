'use client'
import type { OptionObject } from 'payload'

import { SelectInput, useConfig } from '@payloadcms/ui'
import * as React from 'react'

type InternalValue = { relationTo: string; value: string } | null

type Props = {
  internalCollections: string[]
  onChange: (value: InternalValue) => void
  value: InternalValue
}

export function InternalField({ internalCollections, onChange, value }: Props) {
  const { config } = useConfig()
  const [collection, setCollection] = React.useState(value?.relationTo ?? internalCollections[0] ?? '')
  const [docOptions, setDocOptions] = React.useState<OptionObject[]>([])
  const [loading, setLoading] = React.useState(false)

  const collectionOptions: OptionObject[] = internalCollections.map((c) => ({ label: c, value: c }))

  React.useEffect(() => {
    if (!collection) {return}
    setLoading(true)
    fetch(`${config.serverURL}${config.routes.api}/${collection}?limit=200&depth=0`, {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data) => {
        setDocOptions(
          (data.docs ?? []).map((d: Record<string, unknown>) => ({
            label: String(d.title ?? d.slug ?? d.id),
            value: String(d.id),
          })),
        )
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [collection, config.serverURL, config.routes.api])

  return (
    <div>
      {internalCollections.length > 1 && (
        <SelectInput
          label="Collection"
          name="nav-collection"
          onChange={(option) => {
            const opt = option as null | OptionObject
            if (opt?.value) {
              setCollection(opt.value)
              onChange(null)
            }
          }}
          options={collectionOptions}
          path="nav-collection"
          value={collection}
        />
      )}
      <SelectInput
        isClearable
        label="Page"
        name="nav-page"
        onChange={(option) => {
          const opt = option as null | OptionObject
          onChange(opt?.value ? { relationTo: collection, value: opt.value } : null)
        }}
        options={docOptions}
        path="nav-page"
        placeholder="— Select —"
        readOnly={loading}
        value={value?.value ?? ''}
      />
    </div>
  )
}
