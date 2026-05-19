import { notFound } from 'next/navigation'
import config from '@payload-config'
import { getPayload } from 'payload'



export default async function FormPage() {
	const payload = await getPayload({ config })

	const nav = await payload
		.find({
			collection: 'navigation',
		})
		.then((resp) => resp.docs?.[0])
		.catch(() => null)

	if (!nav) {notFound()}

	return (
		<div className="max-w-3xl mx-auto px-4 py-8">
			<pre>{JSON.stringify(nav.items, null, 2)}</pre>
		</div>
	)
}
