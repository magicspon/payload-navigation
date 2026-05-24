import { slugField, type CollectionConfig } from 'payload'

import type { Item, NavigationPluginConfig } from '../types'

import { createCleanTree } from '../utils/createTree'

export const createNavigationCollection = (
  pluginConfig: NavigationPluginConfig,
): CollectionConfig => {
  const { internalCollections = [], maxDepth = 3, navigation: navigationConfig = {} } = pluginConfig

  const {
    fields: extraFields,
    hooks: extraHooks,
    admin: extraAdmin,
    access: extraAccess,
    ...navigationRest
  } = navigationConfig

  return {
    slug: 'navigation',
    labels: { plural: 'Menus', singular: 'Menu' },
    ...navigationRest,
    access: {
      read: () => true,
      ...extraAccess,
    },
    admin: {
      defaultColumns: ['title', 'slug'],
      group: 'Navigation',
      useAsTitle: 'title',
      ...extraAdmin,
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
                depth: 0,
                limit: 500,
                sort: '_order',
                where: { navigation: { equals: originalDoc.id } },
              })
              return createCleanTree(result.docs as unknown as Item[])
            },
          ],
        },
      },
      ...(extraFields ?? []),
    ],
    hooks: {
      ...extraHooks,
      beforeDelete: [
        async ({ id, req }) => {
          await req.payload.delete({
            collection: 'menu_item',
            req,
            where: { navigation: { equals: id } },
          })
        },
        ...(extraHooks?.beforeDelete ?? []),
      ],
    },
  }
}
