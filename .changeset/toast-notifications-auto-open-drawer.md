---
'@spon/payload-navigation': minor
---

Add toast feedback for mutations and auto-open drawer on item creation.

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
