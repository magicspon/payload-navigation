import type { PayloadRequest } from 'payload'

import { APIError } from 'payload'

import { createCleanTree } from '../utils/createTree'
import { getMenuItems } from './items-get'

type UpdateItem = {
  _order: string
  depth: number
  id: string
  parent: null | string
}

export const reorderHandler = async (req: PayloadRequest): Promise<Response> => {
  if (!req.user) {throw new APIError('Unauthorized', 401)}

  const body = await req.json!()
  const { handle, updates } = body as { handle: string; updates: UpdateItem[] }

  if (!handle) {throw new APIError('handle is required', 400)}
  if (!Array.isArray(updates)) {throw new APIError('updates must be an array', 400)}

  await Promise.all(
    updates.map((item) =>
      req.payload.update({
        id: item.id,
        collection: 'menu_item',
        data: {
          _order: item._order,
          depth: item.depth,
          parent: item.parent,
        },
        req,
      }),
    ),
  )

  const docs = await getMenuItems(handle, req)
  const cleanTree = createCleanTree(docs)

  const nav = await req.payload.find({
    collection: 'navigation',
    depth: 0,
    limit: 1,
    req,
    select: { id: true },
    where: { handle: { equals: handle } },
  })

  if (nav.docs[0]) {
    await req.payload.update({
      id: nav.docs[0].id,
      collection: 'navigation',
      data: { items: cleanTree },
      req,
    })
  }

  return Response.json(docs)
}
