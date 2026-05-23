import type { PayloadRequest } from 'payload'

import { APIError } from 'payload'

import type { Item } from '../types'
import { createTree } from '../utils/createTree'

export const MENU_ITEM_SELECT = {
  type: true,
  _order: true,
  collapsed: true,
  custom: true,
  depth: true,
  handle: true,
  internal: true,
  parent: true,
  passive: true,
  title: true,
  url: true,
  value: true,
} as const

export async function getMenuItems(handle: string, req: PayloadRequest): Promise<Item[]> {
  const result = await req.payload.find({
    collection: 'menu_item',
    depth: 1,
    limit: 500,
    req,
    select: MENU_ITEM_SELECT,
    sort: '_order',
    where: { handle: { equals: handle } },
    populate: {
      menu_item: MENU_ITEM_SELECT,
    },
  })
  return result.docs as unknown as Item[]
}

export const itemsGetHandler = async (req: PayloadRequest): Promise<Response> => {
  if (!req.user) {
    throw new APIError('Unauthorized', 401)
  }

  const url = new URL(req.url ?? '')
  const handle = url.searchParams.get('handle')
  if (!handle) {
    throw new APIError('handle is required', 400)
  }

  const docs = await getMenuItems(handle, req)
  return Response.json(createTree(docs))
}
