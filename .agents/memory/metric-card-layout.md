---
name: Metric card layout
description: The correct JSX + CSS structure for dashboard metric/stat cards.
---

## Rule
Metric cards use a **flex-column** layout with exactly 3 visual rows:
1. `.metric-header` — `display: flex; justify-content: space-between` → label (left) + icon badge (right)
2. `<strong>` — the hero number (38px bold, status-colored via `.metric-healthy/warning/critical`)
3. `<p>` — the detail text with a colored `::before` dot

## Why
Grid-based layouts with `grid-template-areas` caused the icon to become an orphaned block at the top, creating disconnected, airy cards that looked amateurish. The flex-column approach with the header row (label + icon side-by-side) matches the Vercel/Linear/Stripe Dashboard pattern.

## How to apply
JSX structure (do not deviate):
```jsx
<div className={`metric ${status ? `metric-card-${status}` : ''}`}>
  <div className="metric-header">
    <span className="metric-label">{label}</span>
    <span className="metric-icon"><DashboardIcon type={icon} /></span>
  </div>
  <strong className={status ? `metric-${status}` : ''}>{value}</strong>
  <p>{detail}</p>
</div>
```

Icon size: 32×32px, `border-radius: 8px`. SVG inside: 16×16px.
Number font-size: 38px.
`.metric-label` is NOT uppercase — it's 13px medium weight in `--muted-strong` color.
