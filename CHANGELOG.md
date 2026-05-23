# @spon/payload-navigation

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
