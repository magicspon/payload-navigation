import type { Payload } from 'payload'

import { devUser } from './helpers/credentials'

const pages = [
  { title: 'Home', slug: 'home' },
  { title: 'About', slug: 'about' },
  { title: 'Contact', slug: 'contact' },
]

export const seed = async (payload: Payload) => {
  const { totalDocs: userCount } = await payload.count({
    collection: 'users',
    where: { email: { equals: devUser.email } },
  })

  if (!userCount) {
    await payload.create({ collection: 'users', data: devUser })
  }

  const { totalDocs: pageCount } = await payload.count({ collection: 'pages' })

  if (!pageCount) {
    await Promise.all(
      pages.map((page) => payload.create({ collection: 'pages', data: page })),
    )
  }
}
