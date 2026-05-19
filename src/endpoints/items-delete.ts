import type { BasePayload, PayloadRequest } from 'payload'

import { APIError } from 'payload'

import { createCleanTree } from '../utils/createTree'
import { getMenuItems } from './items-get'

async function deleteItemTree(payload: BasePayload, itemId: string, req: PayloadRequest) {
  const { docs: children } = await payload.find({
    collection: 'menu_item',
    depth: 0,
    limit: 500,
    req,
    select: { id: true },
    where: { parent: { equals: itemId } },
  })

  for (const child of children) {
    await deleteItemTree(payload, String(child.id), req)
  }

  await payload.delete({ id: itemId, collection: 'menu_item', req })
}

export const itemsDeleteHandler = async (req: PayloadRequest): Promise<Response> => {
  if (!req.user) {throw new APIError('Unauthorized', 401)}

  const id = req.routeParams?.id as string
  const url = new URL(req.url ?? '')
  const handle = url.searchParams.get('handle')

  if (!id) {throw new APIError('id is required', 400)}
  if (!handle) {throw new APIError('handle is required', 400)}

  await deleteItemTree(req.payload, id, req)

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
