import { notFound } from 'next/navigation'
import config from '@payload-config'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const payload = await getPayload({ config })

  const nav = await payload
    .find({
      collection: 'navigation',
      where: {
        slug: { equals: 'test-menu' },
      },
      overrideAccess: true,
    })
    .then((resp) => resp)
    .catch(() => null)

  if (!nav) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <pre>{JSON.stringify({ nav }, null, 2)}</pre>
    </div>
  )
}
