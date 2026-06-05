---
name: Shared page shell styles
description: How Alerts/Sites pages reuse the same band + toolbar style primitives for visual consistency
---

# Shared page-shell style primitives

The redesigned management pages (Alerts, Sites) intentionally share the same CSS
primitives instead of inventing per-page styles:

- Summary band: reuse `.alert-band` + `.alert-band-tile` (with `tone-open|critical|warning|healthy`,
  `.alert-band-head/-label/-dot/-value/-foot`, `.is-active`). Tiles act as quick filters.
- Toolbar: reuse `.alert-toolbar` + `.alert-toolbar-group` + `.alert-toolbar-label`.
- List card header: reuse `.alert-list-head` (h3) + `.alert-list-count`.

**Why:** keeps every list/console page on the exact same scale and visual language as the
dashboard/alerts without duplicating tokens; one change propagates everywhere.

**How to apply:** when redesigning another list page, compose these existing classes first;
only add page-specific classes for the unique content (e.g. Sites adds `.site-grid`/`.site-card`).

## Sites page specifics
- Card grid replaces the old `<table>` SiteTable. Components: `SiteGrid` → `SiteCard` → `SiteCardSkeleton`.
- `SiteCard` is a `div role="button"` (NOT a `<button>`) because it contains inner action buttons
  (Edit/Archive/Restore/Delete). Nested `<button>` is invalid HTML. Actions wrapper stops click
  propagation; card `onKeyDown` must guard `event.target !== event.currentTarget` so keyboard
  presses on inner buttons don't trigger card navigation.
- Status left-rail via `.site-card.rail-{healthy|warning|critical|unknown}::before`.
- Client-side `query` (search) + `statusFilter` (all/healthy/attention/updates); `showArchived`
  still triggers a server refetch (it's in loadData deps) — do not make it client-side.
