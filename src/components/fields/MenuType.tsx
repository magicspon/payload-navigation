'use client'
import type { OptionObject } from 'payload'

import { SelectInput } from '@payloadcms/ui'

import type { MenuItemType } from '../../types'

type Props = {
  internalCollections?: string[]
  onChange: (value: MenuItemType) => void
  value: MenuItemType
}

export function MenuType({ internalCollections = [], onChange, value }: Props) {
  const options: OptionObject[] = [
    { label: 'Web address', value: 'url' },
    ...(internalCollections.length > 0 ? [{ label: 'Internal page', value: 'internal' }] : []),
    { label: 'Custom', value: 'custom' },
    { label: 'Passive', value: 'passive' },
  ]

  return (
    <SelectInput
      isClearable={false}
      label="Type"
      name="nav-type"
      onChange={(option) => {
        const opt = option as null | OptionObject
        if (opt?.value) {onChange(opt.value as MenuItemType)}
      }}
      options={options}
      path="nav-type"
      value={value}
    />
  )
}
