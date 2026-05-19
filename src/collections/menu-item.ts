import type { BasePayload, CollectionConfig } from 'payload'

import type { NavigationPluginConfig, ResolveInternalUrl } from '../types'

const defaultResolveInternalUrl: ResolveInternalUrl = ({ id }) => Promise.resolve(`#${id}`)

export const createMenuItemCollection = (
  pluginConfig: NavigationPluginConfig,
): CollectionConfig => {
  const {
    access = {},
    internalCollections = [],
    maxDepth = 3,
    resolveInternalUrl = defaultResolveInternalUrl,
  } = pluginConfig

  return {
    slug: 'menu_item',
    access: {
      read: () => true,
      ...access.menuItem,
    },
    admin: {
      defaultColumns: ['title', 'type', 'value'],
      group: 'Navigation',
      hidden: true,
      useAsTitle: 'title',
    },
    fields: [
      { name: 'title', type: 'text', required: true },
      {
        name: 'type',
        type: 'select',
        admin: { isClearable: false, position: 'sidebar' },
        defaultValue: 'url',
        options: [
          { label: 'Web address', value: 'url' },
          ...(internalCollections.length > 0
            ? [{ label: 'Internal page', value: 'internal' }]
            : []),
          { label: 'Custom', value: 'custom' },
          { label: 'Passive', value: 'passive' },
        ],
      },
      {
        name: 'parent',
        type: 'relationship',
        admin: { position: 'sidebar' },
        label: 'Parent',
        relationTo: 'menu_item',
      },
      {
        name: 'url',
        type: 'text',
        admin: {
          condition: (_data, siblingData) => siblingData?.type === 'url',
          placeholder: 'https://',
        },
        label: 'URL',
      },
      ...(internalCollections.length > 0
        ? [
            {
              name: 'internal',
              type: 'relationship' as const,
              admin: {
                condition: (_data: Record<string, unknown>, siblingData: Record<string, unknown>) =>
                  siblingData?.type === 'internal',
              },
              label: 'Internal Page',
              relationTo: internalCollections,
            },
          ]
        : []),
      {
        name: 'custom',
        type: 'text',
        admin: {
          condition: (_data, siblingData) => siblingData?.type === 'custom',
          placeholder: '#read-more',
        },
        label: 'Custom',
      },
      {
        name: 'passive',
        type: 'text',
        admin: {
          condition: (_data, siblingData) => siblingData?.type === 'passive',
        },
        label: 'Passive',
      },
      {
        name: 'depth',
        type: 'number',
        admin: { hidden: true },
        defaultValue: 0,
      },
      {
        name: 'handle',
        type: 'text',
        admin: { hidden: true },
        required: true,
      },
      {
        name: 'value',
        type: 'text',
        admin: { position: 'sidebar' },
        label: 'URL / URI',
      },
    ],
    hooks: {
      beforeChange: [
        async ({ data, req }) => {
          if (data?.type === 'internal' && data?.internal && internalCollections.length > 0) {
            try {
              const internal = data.internal
              const relationTo =
                typeof internal === 'object' && internal.relationTo
                  ? internal.relationTo
                  : internalCollections[0]
              const internalId =
                typeof internal === 'object' && internal.value ? internal.value : internal
              const id = typeof internalId === 'string' ? internalId : internalId?.id

              if (id && relationTo) {
                data.value = await resolveInternalUrl({ id, collection: relationTo, payload: req.payload })
              }
            } catch {
              data.value = ''
            }
          } else if (data?.type === 'url') {
            data.value = data.url ?? ''
          } else if (data?.type === 'custom') {
            data.value = data.custom ?? ''
          } else if (data?.type === 'passive') {
            data.value = data.passive ?? ''
          }

          if (data?.parent) {
            const depth = await resolveDepth(req.payload, data.parent, maxDepth)
            if (depth >= maxDepth) {
              throw new Error(`Maximum nesting depth of ${maxDepth} exceeded`)
            }
            data.depth = depth + 1
          } else {
            data.depth = 0
          }

          return data
        },
      ],
    },
    labels: { plural: 'Menu Items', singular: 'Menu Item' },
    orderable: true,
  }
}

async function resolveDepth(payload: BasePayload, parentId: string, maxDepth: number): Promise<number> {
  let current = parentId
  let depth = 0
  while (current && depth <= maxDepth) {
    const parent = await payload.findByID({
      id: current,
      collection: 'menu_item',
      depth: 0,
      select: { depth: true, parent: true },
    })
    if (!parent) {break}
    depth = (parent.depth as number) ?? 0
    current = (parent.parent as string) ?? ''
    if (!current) {break}
  }
  return depth
}
