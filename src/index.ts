import type { Config, PayloadRequest, Plugin } from 'payload'
import { APIError } from 'payload'

import type { NavigationPluginConfig } from './types'

import { createMenuItemCollection } from './collections/menu-item'
import { createNavigationCollection } from './collections/navigation'
import { itemsAddHandler } from './endpoints/items-add'
import { itemsDeleteHandler } from './endpoints/items-delete'
import { itemsGetHandler } from './endpoints/items-get'
import { itemsPatchCollapsedHandler } from './endpoints/items-patch-collapsed'
import { itemsUpdateHandler } from './endpoints/items-update'
import { parentOptionsHandler } from './endpoints/parent-options'
import { reorderHandler } from './endpoints/reorder'

export type { NavigationPluginConfig } from './types'
export type { Item, Menu, MenuItemType, NavigationMenuItem } from './types'

export const navigationPlugin =
  (pluginOptions: NavigationPluginConfig = {}): Plugin =>
  (config: Config): Config => {
    const navigationCollection = createNavigationCollection(pluginOptions)
    const menuItemCollection = createMenuItemCollection(pluginOptions)

    config.collections = [
      ...(config.collections ?? []),
      navigationCollection,
      menuItemCollection,
    ]

    if (pluginOptions.disabled) {return config}

    const { internalCollections = [] } = pluginOptions

    if (internalCollections.length > 0) {
      config.collections = config.collections.map((collection) => {
        if (!internalCollections.includes(collection.slug)) {return collection}

        const slug = collection.slug
        return {
          ...collection,
          hooks: {
            ...collection.hooks,
            beforeDelete: [
              ...(collection.hooks?.beforeDelete ?? []),
              async ({ id, req }: { id: number | string; req: PayloadRequest }) => {
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
            ...(jsonSchema.definitions as Record<string, unknown> ?? {}),
            NavigationMenuItem: {
              type: 'object',
              additionalProperties: false,
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

    config.endpoints = [
      ...(config.endpoints ?? []),
      { handler: itemsGetHandler, method: 'get', path: '/navigation-plugin/items' },
      { handler: itemsAddHandler, method: 'post', path: '/navigation-plugin/items' },
      { handler: itemsUpdateHandler, method: 'put', path: '/navigation-plugin/items/:id' },
      { handler: itemsPatchCollapsedHandler, method: 'patch', path: '/navigation-plugin/items/:id' },
      { handler: itemsDeleteHandler, method: 'delete', path: '/navigation-plugin/items/:id' },
      { handler: reorderHandler, method: 'post', path: '/navigation-plugin/reorder' },
      { handler: parentOptionsHandler, method: 'get', path: '/navigation-plugin/parent-options' },
    ]

    return config
  }
