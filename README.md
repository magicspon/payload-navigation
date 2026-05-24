# @spon/payload-navigation

A [Payload CMS](https://payloadcms.com) plugin for managing navigation menus. Adds a drag-and-drop tree UI to the admin panel, supports multiple link types including internal page relationships, and writes a precomputed clean tree to the navigation document for easy frontend consumption.

## Features

- Drag-and-drop menu builder in the Payload admin
- Four link types: **URL**, **Internal page**, **Custom**, **Passive**
- Configurable nesting depth
- Automatically resolves internal page URLs via a callback
- Prevents deletion of pages that are referenced by a menu item
- Cascades deletion of menu items when a navigation is deleted
- Writes a precomputed `items` field (clean JSON tree) to the navigation document on every change

## Installation

```bash
pnpm add @spon/payload-navigation
```

## Setup

Add the plugin to your `payload.config.ts`:

```ts
import { navigationPlugin } from '@spon/payload-navigation'

export default buildConfig({
  plugins: [
    navigationPlugin({
      internalCollections: ['pages'],
      maxDepth: 3,
      resolveInternalUrl: async ({ id, collection, payload }) => {
        const doc = await payload.findByID({ collection, id, depth: 0 })
        return doc?.slug ? `/${doc.slug}` : '#'
      },
    }),
  ],
})
```

## Options

| Option                | Type                                      | Default       | Description                                               |
| --------------------- | ----------------------------------------- | ------------- | --------------------------------------------------------- |
| `disabled`            | `boolean`                                 | `false`       | Disable the plugin without removing it                    |
| `internalCollections` | `string[]`                                | `[]`          | Collection slugs that can be linked as internal pages     |
| `maxDepth`            | `number`                                  | `3`           | Maximum nesting depth for menu items                      |
| `resolveInternalUrl`  | `ResolveInternalUrl`                      | Returns `#id` | Async function to resolve a URL from an internal document |
| `menuItem`            | `Omit<Partial<CollectionConfig>, 'slug'>` | `{}`          | Extend or override the `menu_item` collection             |
| `navigation`          | `Omit<Partial<CollectionConfig>, 'slug'>` | `{}`          | Extend or override the `navigation` collection            |

### `resolveInternalUrl`

Called whenever a menu item of type `internal` is saved. Use it to resolve the document's URL from its ID.

```ts
type ResolveInternalUrl = (args: {
  id: string
  collection: string
  payload: BasePayload
}) => Promise<string>
```

### `menuItem` and `navigation`

Both options accept any `CollectionConfig` property except `slug`. The merge behaviour differs by property type:

| Property        | Behaviour                                            |
| --------------- | ---------------------------------------------------- |
| `fields`        | Appended after plugin fields                         |
| `hooks`         | Run after plugin hooks (plugin invariants preserved) |
| `admin`         | Shallow-merged with plugin defaults                  |
| `access`        | Shallow-merged — `read` defaults to `() => true`     |
| Everything else | Consumer value overrides plugin default              |

```ts
navigationPlugin({
  menuItem: {
    // extra fields appear in the drawer and pass through to the items tree output
    fields: [
      { name: 'badge', type: 'text' },
      { name: 'icon', type: 'text' },
    ],
    hooks: {
      afterChange: [({ doc }) => revalidateCache(doc)],
    },
    admin: { hidden: false }, // un-hide the collection
    access: {
      create: ({ req }) => req.user?.role === 'admin',
      update: ({ req }) => req.user?.role === 'admin',
      delete: ({ req }) => req.user?.role === 'admin',
    },
  },
  navigation: {
    access: {
      create: ({ req }) => req.user?.role === 'admin',
      delete: ({ req }) => req.user?.role === 'admin',
    },
    versions: { drafts: true },
  },
})
```

## Collections

The plugin registers two collections:

- **`navigation`** — A named menu (e.g. "Main Nav", "Footer"). Contains the visual builder UI and a hidden `items` field with the precomputed tree.
- **`menu_item`** — Individual items within a menu. Managed through the builder UI, not directly.

## The `items` field

The navigation document's `items` field contains a precomputed clean JSON tree, built from the `menu_item` collection on every read:

```ts
type NavigationMenuItem<TExtra extends Record<string, unknown> = Record<string, never>> = {
  id: string
  title: string
  type: string
  href: string // resolved URL for all types
  depth: number
  parent: string | null
  collapsed: boolean
  children?: NavigationMenuItem<TExtra>[]
} & TExtra
```

Any extra fields added to `menu_item` via the `menuItem.fields` option are automatically included in each node. Use the `TExtra` generic to type them in your frontend:

```ts
// If you added { name: 'badge', type: 'text' } to menuItem.fields:
type MyNavItem = NavigationMenuItem<{ badge?: string }>

const nav = await payload.find({
  collection: 'navigation',
  where: { slug: { equals: 'main' } },
})

const tree = nav.docs[0]?.items as MyNavItem[]
```

## Link types

| Type       | Description                                       |
| ---------- | ------------------------------------------------- |
| `url`      | An absolute or relative web address               |
| `internal` | A document from one of your `internalCollections` |
| `custom`   | Any string value (e.g. an anchor `#section`)      |
| `passive`  | A label with no link (for parent-only items)      |

## React components

Tree UI components are exported from `@spon/payload-navigation/client` for embedding in custom admin views:

```ts
import { MenuTree, TreeItem, DeleteMenuItem } from '@spon/payload-navigation/client'
```

These are all client components (`'use client'`).

## Development

```bash
# Install dependencies
pnpm install

# Copy env and start the dev server
cp dev/.env.example dev/.env
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint

# Unit tests
pnpm test:unit

# E2E tests (requires dev server running)
pnpm test:e2e

# Build
pnpm build
```
