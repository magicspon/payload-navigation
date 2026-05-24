import type { BasePayload } from 'payload'

import type { Item } from '../../types'

import { MenuTreeClient } from './MenuTreeClient'
import { Banner } from '@payloadcms/ui'

type Props = {
  data?: Record<string, unknown>
  internalCollections?: string[]
  maxDepth?: number
  payload: BasePayload
}

export async function MenuTreeServer({
  data,
  internalCollections = [],
  maxDepth = 3,
  payload,
}: Props) {
  const navigationId = (data as Record<string, unknown>)?.id as string | undefined

  if (!navigationId) {
    return <Banner type="info">Save this navigation first to start managing menu items.</Banner>
  }

  const result = await payload.find({
    collection: 'menu_item',
    depth: 0,
    limit: 500,
    overrideAccess: true,
    sort: '_order',
    where: { navigation: { equals: navigationId } },
  })

  return (
    <MenuTreeClient
      initialDocs={result.docs as unknown as Item[]}
      internalCollections={internalCollections}
      maxDepth={maxDepth}
      navigationId={navigationId}
    />
  )
}
