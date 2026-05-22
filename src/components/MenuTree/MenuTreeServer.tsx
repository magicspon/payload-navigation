import type { UIFieldServerProps } from 'payload'

import type { Item } from '../../types'

import { MenuTreeClient } from './MenuTreeClient'

type Props = UIFieldServerProps & {
  internalCollections?: string[]
  maxDepth?: number
}

export async function MenuTreeServer({
  data,
  internalCollections = [],
  maxDepth = 3,
  payload,
}: Props) {
  const handle = (data as Record<string, unknown>)?.handle as string | undefined
  if (!handle) {
    return null
  }

  const result = await payload.find({
    collection: 'menu_item',
    depth: 1,
    limit: 500,
    overrideAccess: true,
    sort: '_order',
    where: { handle: { equals: handle } },
  })

  console.log(result)

  return (
    <MenuTreeClient
      initialDocs={result.docs as unknown as Item[]}
      internalCollections={internalCollections}
      maxDepth={maxDepth}
      navigationHandle={handle}
    />
  )
}
