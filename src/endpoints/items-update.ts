import type { PayloadRequest } from 'payload'

import { APIError } from 'payload'

import { createCleanTree } from '../utils/createTree'
import { getMenuItems } from './items-get'

export const itemsUpdateHandler = async (req: PayloadRequest): Promise<Response> => {
  if (!req.user) { throw new APIError('Unauthorized', 401) }

  const id = req.routeParams?.id as string
  if (!id) { throw new APIError('id is required', 400) }

  const body = await req.json!()
  const { type, custom, handle, internal, parent, passive, relationTo, title, url } = body as Record<string, string>

  if (!handle || !title || !type) { throw new APIError('handle, title, and type are required', 400) }

  const data: Record<string, unknown> = { type, handle, title }

  switch (type) {
    case 'custom':
      if (!custom) { throw new APIError('custom is required for type custom', 400) }
      data.custom = custom
      break
    case 'internal':
      if (!internal) { throw new APIError('internal is required for type internal', 400) }
      data.internal = { relationTo, value: internal }
      break
    case 'passive':
      if (!passive) { throw new APIError('passive is required for type passive', 400) }
      data.passive = passive
      break
    case 'url':
      if (!url) { throw new APIError('url is required for type url', 400) }
      data.url = url
      break
    default:
      throw new APIError(`Unknown type: ${type}`, 400)
  }

  data.parent = parent ?? null

  await req.payload.update({ id, collection: 'menu_item', data, req })

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
