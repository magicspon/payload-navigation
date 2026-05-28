# @spon/payload-navigation

## 0.4.0

### Minor Changes

- c260e17: Add toast feedback for mutations and auto-open drawer on item creation.
  - Shows a success toast after reordering items (`Order saved`)
  - Shows a success toast after deleting an item (`Item deleted`)
  - Shows an error toast if reordering, deleting, or toggling collapse fails
  - Automatically opens the edit drawer for a newly created item so it can be configured immediately

  Allow consumers to extend both collections via plugin options.
  - `menuItem` and `navigation` now accept any `CollectionConfig` property except `slug`
  - Extra `fields` are appended after the plugin's built-in fields
  - Extra `hooks` run after the plugin's own hooks, preserving plugin invariants
  - `admin` and `access` are shallow-merged with plugin defaults
  - All other collection properties (`labels`, `orderable`, `timestamps`, `versions`, `endpoints`, etc.) override plugin defaults
  - Extra `menu_item` fields pass through to the `NavigationMenuItem` tree output
  - `NavigationMenuItem` is now a generic type `NavigationMenuItem<TExtra>` for typed access to extra fields on the frontend

## 0.3.1

### Patch Changes

- 78e94b3: Hide the internal `menuItem` collection from the Payload admin UI.

## 0.3.0

### Minor Changes

- 821e100: Refactor drag-and-drop and admin UI.
  - Splits `MenuTree` into a server component (`MenuTreeServer`) and a client component (`MenuTreeClient`) for cleaner RSC boundaries
  - Rewrites drag-and-drop using `@atlaskit/pragmatic-drag-and-drop` with improved nesting, unnesting, and sibling reordering behaviour
  - Adds collapse/expand toggle per tree item and keyboard move controls (up/down)
  - Adds `items-patch-collapsed` endpoint to persist collapsed state
  - Refactors `EditMenuItem` drawer to use `data-testid="edit-drawer"` and scoped field selectors
  - Adds `coerceRelId` utility and improves internal relationship handling across endpoints

## 0.2.0

### Minor Changes

- 86a25c3: Initial release.

  Adds navigation menu management to Payload CMS with a drag-and-drop tree UI, four link types (URL, internal page, custom, passive), configurable nesting depth, and a precomputed JSON tree written to the navigation document for frontend consumption.
