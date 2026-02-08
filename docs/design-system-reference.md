# IntervoxAI Design System Reference

## Typography
- Body: `Inter` (`--font-family-body`)
- Display: `Instrument Serif` (`--font-family-heading`)
- Mono: `JetBrains Mono` (`--font-family-mono`)

## Core Semantic Tokens
- Surfaces: `background`, `foreground`, `surface-1`, `surface-2`, `surface-3`
- Component primitives: `card`, `popover`, `border`, `input`, `ring`
- Brand: `primary`, `accent`
- Status: `success`, `warning`, `error`, `info`
- Action destructive alias: `destructive` (maps to `error`)

## Legacy Tokens Removed
These are unsupported and blocked by CI style guards:
- `text-light-*`
- `bg-dark-*`
- `card-border`
- `card-interview`
- `btn-primary`
- `btn-secondary`
- `badge-text`

## Approved Component APIs
### Button variants
- `default`
- `secondary`
- `outline`
- `ghost`
- `destructive`
- `success`
- `link`

### Badge variants
- `default`
- `primary`
- `secondary`
- `success`
- `warning`
- `error`
- `info`
- `outline`

### Card variants
- `default`
- `interactive`
- `elevated`
- `gradient`

## Style Guards
Run:
```bash
npm run guard:styles
```

Checks:
- legacy class/token usage
- hardcoded hex colors in `app/**` and `components/**` TS/TSX/JS/JSX (except `app/layout.tsx`)
