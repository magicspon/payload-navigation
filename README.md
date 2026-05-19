# @spon/payload-navigation

A [Payload CMS](https://payloadcms.com) plugin for managing navigation menus. Adds a drag-and-drop tree UI to the admin panel, supports multiple link types including internal page relationships, and writes a precomputed clean tree to the navigation document for easy frontend consumption.

## Features

- Drag-and-drop menu builder in the Payload admin
- Four link types: **URL**, **Internal page**, **Custom**, **Passive**
- Configurable nesting depth
- Automatically resolves internal page URLs via a callback
- Prevents deletion of pages that are referenced by a menu item
- Cascades deletion of menu items when a navigation is deleted
- Writes a precomputed `data` field (clean JSON tree) to the navigation document on every change

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

| Option | Type | Default | Description |
|---|---|---|---|
| `disabled` | `boolean` | `false` | Disable the plugin without removing it |
| `internalCollections` | `string[]` | `[]` | Collection slugs that can be linked as internal pages |
| `maxDepth` | `number` | `3` | Maximum nesting depth for menu items |
| `resolveInternalUrl` | `ResolveInternalUrl` | Returns `#id` | Async function to resolve a URL from an internal document |
| `access` | `NavigationAccess` | Payload defaults | Override collection-level access for `navigation` and `menu_item` |

### `resolveInternalUrl`

Called whenever a menu item of type `internal` is saved. Use it to resolve the document's URL from its ID.

```ts
type ResolveInternalUrl = (args: {
  id: string
  collection: string
  payload: BasePayload
}) => Promise<string>
```

### `access`

```ts
type NavigationAccess = {
  navigation?: CollectionConfig['access']
  menuItem?: CollectionConfig['access']
}
```

Both collections default `read` to public (`() => true`). Override any operation:

```ts
navigationPlugin({
  access: {
    navigation: {
      create: ({ req }) => req.user?.role === 'admin',
      update: ({ req }) => req.user?.role === 'admin',
      delete: ({ req }) => req.user?.role === 'admin',
    },
  },
})
```

## Collections

The plugin registers two collections:

- **`navigation`** — A named menu (e.g. "Main Nav", "Footer"). Contains the visual builder UI and a hidden `data` field with the precomputed tree.
- **`menu_item`** — Individual items within a menu. Managed through the builder UI, not directly.

## The `data` field

Every time a menu item is added, edited, reordered, or deleted, the navigation document's `data` field is updated with a clean JSON tree:

```ts
type NavigationMenuItem = {
  id: string
  title: string
  type: string
  value: string      // resolved URL for all types
  depth: number
  parent: string | null
  children?: NavigationMenuItem[]
}
```

Query it directly from the `navigation` collection in your frontend:

```ts
const nav = await payload.find({
  collection: 'navigation',
  where: { slug: { equals: 'main' } },
})

const tree = nav.docs[0]?.data // NavigationMenuItem[]
```

## Link types

| Type | Description |
|---|---|
| `url` | An absolute or relative web address |
| `internal` | A document from one of your `internalCollections` |
| `custom` | Any string value (e.g. an anchor `#section`) |
| `passive` | A label with no link (for parent-only items) |

## React components

If you want to embed the menu builder or tree elsewhere, components are exported from `@spon/payload-navigation/client`:

```ts
import { MenuBuilder, MenuTree, TreeItem, EditMenuItem, DeleteMenuItem } from '@spon/payload-navigation/client'
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
pnpm exec tsc --noEmit

# Lint
pnpm lint

# Integration tests
pnpm test:int

# E2E tests (requires dev server running)
pnpm test:e2e

# Build
pnpm build
```
