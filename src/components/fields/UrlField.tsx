'use client'
import type { ChangeEvent } from 'react'

import { TextInput } from '@payloadcms/ui'

type Props = {
  onChange: (value: string) => void
  value: string | undefined
}

export function UrlField({ onChange, value }: Props) {
  return (
    <TextInput
      label="URL"
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      path="nav-url"
      placeholder="https://"
      value={value ?? ''}
    />
  )
}
