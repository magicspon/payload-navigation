'use client'
import type { ChangeEvent } from 'react'

import { TextInput } from '@payloadcms/ui'

type Props = {
  onChange: (value: string) => void
  value: string | undefined
}

export function CustomField({ onChange, value }: Props) {
  return (
    <TextInput
      label="Custom value"
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      path="nav-custom"
      placeholder="#read-more"
      value={value ?? ''}
    />
  )
}
