---
name: Brand logo architecture
description: How the SitePulse brand mark (icon + name + subtitle) should be rendered everywhere in the app.
---

## Rule
All brand appearances (sidebar, any future header) must use the `<BrandLogo />` component. Never inline the icon + text markup directly.

## Why
Previously the sidebar used `<PulseMark />` + separate `brand-name` / `brand-subtitle` divs while the login page inlined the markup. This led to drift. One PNG change would need touching multiple places.

## How to apply
- `BrandLogo` is defined in `App.jsx` and imports `sitepulseIcon` from `./assets/sitepulse-icon.png` — this is the only place the icon PNG is wired to the brand.
- CSS classes: `.brand-logo`, `.brand-logo-icon`, `.brand-logo-name`, `.brand-logo-sub` (in `App.css`).
- The login page brand panel uses its own dedicated CSS (`.login-brand-logo-*`) for sizing reasons and does NOT use `BrandLogo` — that's intentional; the login panel logo is prominently large.
- `PulseMark` still exists for icon-only use cases (e.g. inline badges) but is no longer used in the sidebar.
