---
"@spon/payload-navigation": patch
---

Fix several menu-builder reliability issues:

- Reorder and collapse requests now check the HTTP response status, so a rejected save surfaces an error toast instead of a false "Order saved".
- The tree UI now enforces `maxDepth` before saving, preventing drops the server would reject.
- Reorder updates are applied sequentially (parent-before-child) so each item's depth is recomputed from a persisted parent.
- `passive` menu items no longer get a bogus `href` set to their label text.
- Removed the hardcoded 500-item limit from menu reads, the navigation `items` tree, and child-cascade deletion.
- `menu_item.orderable` can no longer be accidentally disabled via the `menuItem` config override.
