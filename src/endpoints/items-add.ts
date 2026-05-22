import type { PayloadRequest } from 'payload'

import { APIError } from 'payload'

import { createTree } from '../utils/createTree'
import { coerceRelId } from '../utils/coerceRelId'
import { getMenuItems } from './items-get'

export const itemsAddHandler = async (req: PayloadRequest): Promise<Response> => {
  if (!req.user) {
    throw new APIError('Unauthorized', 401)
  }

  const body = await req.json!()
  const { type, custom, handle, internal, parent, passive, relationTo, title, url } =
    body as Record<string, string>

  if (!handle || !title || !type) {
    throw new APIError('handle, title, and type are required', 400)
  }

  const data: Record<string, unknown> = { type, handle, title }

  switch (type) {
    case 'custom':
      if (!custom) {
        throw new APIError('custom is required for type custom', 400)
      }
      data.custom = custom
      break
    case 'internal':
      if (!internal) {
        throw new APIError('internal is required for type internal', 400)
      }
      data.internal = { relationTo, value: coerceRelId(internal) }
      break
    case 'passive':
      if (!passive) {
        throw new APIError('passive is required for type passive', 400)
      }
      data.passive = passive
      break
    case 'url':
      if (!url) {
        throw new APIError('url is required for type url', 400)
      }
      data.url = url
      break
    default:
      throw new APIError(`Unknown type: ${type}`, 400)
  }

  if (parent) {
    data.parent = coerceRelId(parent)
  }

  await req.payload.create({ collection: 'menu_item', data: data as never, req })

  const docs = await getMenuItems(handle, req)
  const cleanTree = createTree(docs)

  return Response.json({ tree: cleanTree, docs })
}
