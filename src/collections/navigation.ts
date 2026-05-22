import { slugField, type CollectionConfig } from 'payload'

import type { NavigationPluginConfig } from '../types'

export const createNavigationCollection = (
  pluginConfig: NavigationPluginConfig,
): CollectionConfig => {
  const { access = {}, internalCollections = [], maxDepth = 3 } = pluginConfig

  return {
    slug: 'navigation',
    access: {
      read: () => true,
      ...access.navigation,
    },
    admin: {
      defaultColumns: ['title', 'slug'],
      group: 'Navigation',
      useAsTitle: 'title',
    },
    fields: [
      { name: 'title', type: 'text', required: true },
			slugField({ position: 'sidebar', useAsSlug: 'title', }),
      {
        name: 'handle',
        type: 'text',
        admin: { hidden: true },
        defaultValue: () => crypto.randomUUID(),
        required: true,
        unique: true,
      },
      {
        name: 'menu',
        type: 'ui',
        admin: {
          components: {
            Field: {
              clientProps: { internalCollections, maxDepth },
              path: '@spon/payload-navigation/client#MenuBuilder',
            },
          },
          position: 'sidebar',
        },
      },
      {
        name: 'tree',
        type: 'ui',
        admin: {
          components: {
            Field: {
              serverProps: { internalCollections, maxDepth },
              path: '@spon/payload-navigation/rsc#MenuTreeServer',
            },
          },
        },
      },
      {
        name: 'items',
        type: 'json',
        admin: { hidden: false, readOnly: true },
        typescriptSchema: [() => ({ type: 'array', items: { $ref: '#/definitions/NavigationMenuItem' } })],
      },
    ],
    hooks: {
      beforeDelete: [
        async ({ id, req: { payload } }) => {
          const doc = await payload.findByID({
            id,
            collection: 'navigation',
            depth: 0,
            select: { handle: true },
          })
          if (doc?.handle) {
            await payload.delete({
              collection: 'menu_item',
              where: { handle: { equals: doc.handle } },
            })
          }
        },
      ],
    },
    labels: { plural: 'Menus', singular: 'Menu' },
  }
}
