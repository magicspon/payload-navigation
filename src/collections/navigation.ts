import { slugField, type CollectionConfig } from 'payload'

import type { Item, NavigationPluginConfig } from '../types'

import { createCleanTree } from '../utils/createTree'

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
      slugField({ position: 'sidebar', useAsSlug: 'title' }),
      {
        name: 'items',
        type: 'json',
        admin: {
          components: {
            Field: {
              serverProps: { internalCollections, maxDepth },
              path: '@spon/payload-navigation/rsc#MenuTreeServer',
            },
          },
        },
        typescriptSchema: [
          () => ({ type: 'array', items: { $ref: '#/definitions/NavigationMenuItem' } }),
        ],
        hooks: {
          afterRead: [
            async ({ originalDoc, req }) => {
              const result = await req.payload.find({
                collection: 'menu_item',
                depth: 1,
                limit: 500,
                sort: '_order',
                where: { navigation: { equals: originalDoc.id } },
                select: {
                  parent: true,
                  title: true,
                },
              })
              return createCleanTree(result.docs as unknown as Item[])
            },
          ],
        },
      },
    ],
    hooks: {
      beforeDelete: [
        async ({ id, req }) => {
          await req.payload.delete({
            collection: 'menu_item',
            req,
            where: { navigation: { equals: id } },
          })
        },
      ],
    },
    labels: { plural: 'Menus', singular: 'Menu' },
  }
}
