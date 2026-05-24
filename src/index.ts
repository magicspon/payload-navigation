import type { Config, PayloadRequest, Plugin } from 'payload'
import { APIError } from 'payload'

import type { ID, NavigationPluginConfig } from './types'

import { createMenuItemCollection } from './collections/menu-item'
import { createNavigationCollection } from './collections/navigation'

export type { NavigationPluginConfig, ResolveInternalUrl } from './types'
export type { Item, Menu, MenuItemType, NavigationMenuItem } from './types'

export const navigationPlugin =
  (pluginOptions: NavigationPluginConfig = {}): Plugin =>
  (config: Config): Config => {
    const navigationCollection = createNavigationCollection(pluginOptions)
    const menuItemCollection = createMenuItemCollection(pluginOptions)

    config.collections = [...(config.collections ?? []), navigationCollection, menuItemCollection]

    if (pluginOptions.disabled) {
      return config
    }

    const { internalCollections = [] } = pluginOptions

    if (internalCollections.length > 0) {
      config.collections = config.collections.map((collection) => {
        if (!internalCollections.includes(collection.slug)) {
          return collection
        }

        const slug = collection.slug
        return {
          ...collection,
          hooks: {
            ...collection.hooks,
            beforeDelete: [
              ...(collection.hooks?.beforeDelete ?? []),
              async ({ id, req }: { id: ID; req: PayloadRequest }) => {
                const result = await req.payload.find({
                  collection: 'menu_item',
                  depth: 0,
                  limit: 5,
                  req,
                  select: { title: true },
                  where: {
                    and: [
                      { 'internal.relationTo': { equals: slug } },
                      { 'internal.value': { equals: String(id) } },
                    ],
                  },
                })

                if (result.totalDocs > 0) {
                  const names = result.docs
                    .map((d) => d.title as string)
                    .filter(Boolean)
                    .join(', ')
                  throw new APIError(
                    `Cannot delete: this page is referenced by ${result.totalDocs} menu item${result.totalDocs === 1 ? '' : 's'}${names ? ` (${names})` : ''}. Remove it from the menu before deleting.`,
                    400,
                  )
                }
              },
            ],
          },
        }
      })
    }

    config.typescript = {
      ...config.typescript,
      schema: [
        ...(config.typescript?.schema ?? []),
        ({ jsonSchema }) => ({
          ...jsonSchema,
          definitions: {
            ...(jsonSchema.definitions as Record<string, unknown>),
            NavigationMenuItem: {
              type: 'object',
              additionalProperties: true,
              required: ['id', 'title', 'type', 'href', 'depth', 'parent', 'collapsed'],
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                type: { type: 'string' },
                href: { type: 'string' },
                depth: { type: 'number' },
                collapsed: { type: 'boolean' },
                parent: { oneOf: [{ type: 'string' }, { type: 'null' }] },
                children: { type: 'array', items: { $ref: '#/definitions/NavigationMenuItem' } },
              },
            },
          },
        }),
      ],
    }

    return config
  }
