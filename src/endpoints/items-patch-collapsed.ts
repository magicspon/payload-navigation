import type { PayloadRequest } from 'payload'

import { APIError } from 'payload'

import { createTree } from '../utils/createTree'
import { getMenuItems } from './items-get'

export const itemsPatchCollapsedHandler = async (req: PayloadRequest): Promise<Response> => {
  if (!req.user) {
    throw new APIError('Unauthorized', 401)
  }

  const id = req.routeParams?.id as string
  if (!id) {
    throw new APIError('id is required', 400)
  }

  const body = await req.json!()
  const { collapsed, handle } = body as { collapsed: boolean; handle: string }

  if (typeof collapsed !== 'boolean') {
    throw new APIError('collapsed must be a boolean', 400)
  }
  if (!handle) {
    throw new APIError('handle is required', 400)
  }

  await req.payload.update({
    id,
    collection: 'menu_item',
    data: { collapsed } as never,
    req,
  })

  const docs = await getMenuItems(handle, req)
  const cleanTree = createTree(docs)

  return Response.json({ tree: cleanTree, docs })
}
