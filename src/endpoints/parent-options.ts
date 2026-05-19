import type { PayloadRequest } from 'payload'

import { APIError } from 'payload'

export const parentOptionsHandler = async (req: PayloadRequest): Promise<Response> => {
  if (!req.user) {throw new APIError('Unauthorized', 401)}

  const url = new URL(req.url ?? '')
  const handle = url.searchParams.get('handle')
  const excludeId = url.searchParams.get('excludeId')

  if (!handle) {throw new APIError('handle is required', 400)}

  const result = await req.payload.find({
    collection: 'menu_item',
    depth: 0,
    limit: 500,
    req,
    select: { depth: true, parent: true, title: true },
    sort: '_order',
    where: {
      and: [
        { handle: { equals: handle } },
        ...(excludeId ? [{ id: { not_equals: excludeId } }] : []),
      ],
    },
  })

  return Response.json(result.docs)
}
