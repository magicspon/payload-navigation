'use client'
import type { ChangeEvent } from 'react'

import { TextInput } from '@payloadcms/ui'

type Props = {
  onChange: (value: string) => void
  value: string | undefined
}

export function PassiveField({ onChange, value }: Props) {
  return (
    <TextInput
      label="Passive label"
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      path="nav-passive"
      placeholder="e.g. Products"
      value={value ?? ''}
    />
  )
}
