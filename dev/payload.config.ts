import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { navigationPlugin } from '@spon/payload-navigation'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { testEmailAdapter } from './helpers/testEmailAdapter'
import { seed } from './seed'
import { Page } from 'payload-types'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname
}

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    {
      slug: 'pages',
      admin: { useAsTitle: 'title' },
      fields: [
        { name: 'title', type: 'text' },
        { name: 'slug', type: 'text' },
      ],
    },
    {
      slug: 'posts',
      admin: { useAsTitle: 'title' },
      fields: [
        { name: 'title', type: 'text' },
        { name: 'slug', type: 'text' },
      ],
    },
    {
      slug: 'media',
      fields: [],
      upload: {
        staticDir: path.resolve(dirname, 'media'),
      },
    },
  ],
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL ?? 'file:./dev.db',
    },
  }),
  editor: lexicalEditor(),
  email: testEmailAdapter,
  onInit: async (payload) => {
    await seed(payload)
  },
  plugins: [
    navigationPlugin({
      internalCollections: ['pages', 'posts'],
      maxDepth: 3,
      resolveInternalUrl: async ({ id, collection, payload }) => {
        const doc = await payload.findByID({ collection, id, depth: 0 })

        if (collection === 'pages') {
          const docNode = doc as Page
          return docNode?.slug ? `/${docNode.slug}` : '#'
        }

        return 'TBD'
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
})
