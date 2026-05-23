---
'@spon/payload-navigation': minor
---

Refactor drag-and-drop and admin UI.

- Splits `MenuTree` into a server component (`MenuTreeServer`) and a client component (`MenuTreeClient`) for cleaner RSC boundaries
- Rewrites drag-and-drop using `@atlaskit/pragmatic-drag-and-drop` with improved nesting, unnesting, and sibling reordering behaviour
- Adds collapse/expand toggle per tree item and keyboard move controls (up/down)
- Adds `items-patch-collapsed` endpoint to persist collapsed state
- Refactors `EditMenuItem` drawer to use `data-testid="edit-drawer"` and scoped field selectors
- Adds `coerceRelId` utility and improves internal relationship handling across endpoints
