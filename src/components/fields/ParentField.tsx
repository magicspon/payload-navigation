'use client'
import type { OptionObject } from 'payload'

import { SelectInput } from '@payloadcms/ui'
import * as React from 'react'

import type { Menu } from '../../types'

type Props = {
  excludeId?: string
  items: Menu[]
  onChange: (value: null | string) => void
  value: null | string | undefined
}

function flattenToOptions(nodes: Menu[], excludeId?: string): OptionObject[] {
  const result: OptionObject[] = []
  function traverse(items: Menu[]) {
    for (const item of items) {
      if (!excludeId || String(item.id) !== String(excludeId)) {
        const depth = item.depth ?? 0
        result.push({
          label: `${'›'.repeat(depth)}${depth > 0 ? ' ' : ''}${item.title}`,
          value: item.id,
        })
      }
      if (item.children?.length) traverse(item.children)
    }
  }
  traverse(nodes)
  return result
}

export function ParentField({ excludeId, items, onChange, value }: Props) {
  const options = React.useMemo(
    () => flattenToOptions(items, excludeId),
    [items, excludeId],
  )

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
      value={value ?? ''}
    />
  )
}
