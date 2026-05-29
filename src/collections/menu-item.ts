import type { BasePayload, CollectionConfig, Where } from 'payload'

import type { ID, NavigationPluginConfig, ResolveInternalUrl } from '../types'

const defaultResolveInternalUrl: ResolveInternalUrl = ({ id }) => Promise.resolve(`#${id}`)

export const createMenuItemCollection = (
  pluginConfig: NavigationPluginConfig,
): CollectionConfig => {
  const {
    internalCollections = [],
    maxDepth = 3,
    menuItem: menuItemConfig = {},
    resolveInternalUrl = defaultResolveInternalUrl,
  } = pluginConfig

  const {
    fields: extraFields,
    hooks: extraHooks,
    admin: extraAdmin,
    access: extraAccess,
    ...menuItemRest
  } = menuItemConfig

  return {
    slug: 'menu_item',
    labels: { plural: 'Menu Items', singular: 'Menu Item' },
    ...menuItemRest,
    // `orderable` is required for the drag-and-drop `_order` field; keep it after the
    // consumer spread so it can't be accidentally disabled.
    orderable: true,
    access: {
      read: () => true,
      ...(extraAccess ?? {}),
    },
    admin: {
      defaultColumns: ['title', 'type', 'navigation'],
      group: 'Navigation',
      hidden: true,
      useAsTitle: 'title',
      ...(extraAdmin ?? {}),
    },
    fields: [
      {
        name: 'type',
        type: 'select',
        admin: { isClearable: false },
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
      { name: 'title', type: 'text', required: true },
      {
        name: 'navigation',
        type: 'relationship',
        admin: { hidden: true },
        relationTo: 'navigation',
        required: true,
      },

      {
        name: 'parent',
        type: 'relationship',
        admin: { position: 'sidebar' },
        filterOptions: ({ id, siblingData }) => {
          const nav = (siblingData as Record<string, unknown>)?.navigation
          if (!nav) return true
          const navId = typeof nav === 'object' && nav !== null ? (nav as { id: ID }).id : nav
          if (!navId) return true

          const where: Where = { navigation: { equals: navId as string } }
          if (id) where.id = { not_equals: id }
          return where
        },
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
        name: 'collapsed',
        type: 'checkbox',
        admin: { hidden: true },
        defaultValue: false,
      },
      {
        name: 'depth',
        type: 'number',
        admin: { hidden: true },
        defaultValue: 0,
      },
      {
        name: 'href',
        type: 'text',
        admin: { readOnly: true, position: 'sidebar' },
        label: 'Resolved URL',
      },
      ...(extraFields ?? []),
    ],
    hooks: {
      ...(extraHooks ?? {}),
      beforeChange: [
        async ({ data, originalDoc, req }) => {
          if (data?.parent && originalDoc?.id) {
            const parentId =
              typeof data.parent === 'object' && data.parent !== null
                ? (data.parent as { id: unknown }).id
                : data.parent
            if (String(parentId) === String(originalDoc.id)) {
              throw new Error('A menu item cannot be its own parent')
            }
          }

          if (data?.type === 'internal' && data?.internal && internalCollections.length > 0) {
            try {
              const internal = data.internal
              const relationTo =
                typeof internal === 'object' && internal.relationTo
                  ? internal.relationTo
                  : internalCollections[0]
              const internalId =
                typeof internal === 'object' && internal.value ? internal.value : internal
              const id =
                typeof internalId === 'string' || typeof internalId === 'number'
                  ? String(internalId)
                  : internalId?.id

              if (id && relationTo) {
                data.href = await resolveInternalUrl({
                  id,
                  collection: relationTo,
                  payload: req.payload,
                })
              }
            } catch {
              data.href = ''
            }
          } else if (data?.type === 'url') {
            data.href = data.url ?? ''
          } else if (data?.type === 'custom') {
            data.href = data.custom ?? ''
          } else if (data?.type === 'passive') {
            // Passive items are labels only — they never produce a link.
            data.href = ''
          }

          if (data?.parent) {
            const depth = await resolveDepth(req.payload, data.parent)
            if (depth + 1 >= maxDepth) {
              throw new Error(`Maximum nesting depth of ${maxDepth} exceeded`)
            }
            data.depth = depth + 1
          } else {
            data.depth = 0
          }

          return data
        },
        ...(extraHooks?.beforeChange ?? []),
      ],
      beforeDelete: [
        async ({ id, req }) => {
          // Delete all direct children; each deletion re-runs this hook and
          // cascades to its own descendants. `where` avoids any row-count cap.
          await req.payload.delete({
            collection: 'menu_item',
            req,
            where: { parent: { equals: id } },
          })
        },
        ...(extraHooks?.beforeDelete ?? []),
      ],
    },
  }
}

async function resolveDepth(payload: BasePayload, parentId: string): Promise<number> {
  const parent = await payload.findByID({
    id: parentId,
    collection: 'menu_item',
    depth: 0,
    select: { depth: true },
  })
  return (parent?.depth as number) ?? 0
}
