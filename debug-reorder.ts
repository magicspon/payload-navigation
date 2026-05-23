import type { Payload } from 'payload'
import config from '@payload-config'
import { createPayloadRequest, getPayload } from 'payload'
import { itemsAddHandler } from './src/endpoints/items-add.js'
import { reorderHandler } from './src/endpoints/reorder.js'
import { createTree } from './src/utils/createTree.js'
import { calculateUpdates } from './src/utils/calculateUpdates.js'

let payload: Payload

async function makeRequest(url: string, options: RequestInit = {}, user?: Record<string, unknown>) {
  const request = new Request(`http://localhost:3000${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const payloadRequest = await createPayloadRequest({ config, request })
  if (user) (payloadRequest as any).user = user
  return payloadRequest
}

const adminUser = { id: 'admin', email: 'dev@payloadcms.com', collection: 'users' }

async function main() {
  payload = await getPayload({ config })

  await payload.delete({ collection: 'menu_item', where: { id: { exists: true } } })
  await payload.delete({ collection: 'navigation', where: { id: { exists: true } } })

  const nav = await payload.create({ collection: 'navigation', data: { title: 'Test', slug: 'test' } })
  const handle = nav.handle as string

  const r1 = await makeRequest('/api/navigation-plugin/items', {
    method: 'POST', body: JSON.stringify({ handle, title: 'A', type: 'url', url: '/a' }),
  }, adminUser)
  const docs1 = await (await itemsAddHandler(r1)).json()

  const r2 = await makeRequest('/api/navigation-plugin/items', {
    method: 'POST', body: JSON.stringify({ handle, title: 'B', type: 'url', url: '/b' }),
  }, adminUser)
  const docs2 = await (await itemsAddHandler(r2)).json()

  console.log('Raw docs IDs:', docs2.map((d: any) => ({ id: d.id, type: typeof d.id, parent: d.parent, parentType: typeof d.parent })))

  const localTree = createTree(docs2)
  console.log('Tree IDs:', localTree.map((item: any) => ({ id: item.id, type: typeof item.id })))

  const updates = calculateUpdates(localTree, docs2)
  console.log('Updates:', JSON.stringify(updates))

  const reorderReq = await makeRequest('/api/navigation-plugin/reorder', {
    method: 'POST', body: JSON.stringify({ handle, updates }),
  }, adminUser)

  try {
    const res = await reorderHandler(reorderReq)
    console.log('Status:', res.status)
  } catch (e: any) {
    console.error('Error:', JSON.stringify(e?.data ?? e?.message ?? String(e)))
  }

  await payload.destroy()
}

main().catch(e => { console.error(e); process.exit(1) })
