'use client'
import type { ChangeEvent } from 'react'

import { TextInput } from '@payloadcms/ui'

type Props = {
  onChange: (value: string) => void
  value: string | undefined
}

export function TitleInput({ onChange, value }: Props) {
  return (
    <TextInput
      label="Label"
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      path="nav-title"
      placeholder="Menu item label"
      value={value ?? ''}
    />
  )
}
