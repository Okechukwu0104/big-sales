

# Fix: Share Button Dialog Not Opening

## Problem Found
The share button's `DialogTrigger` has `onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}` which prevents the Radix dialog from opening. The `e.preventDefault()` blocks the trigger's native behavior. This affects both the ProductDetail page and the ProductCard.

## Fix

**File: `src/components/ProductShare.tsx`**

Remove `e.preventDefault()` from both trigger button variants, keeping only `e.stopPropagation()` (which is needed to prevent the ProductCard's parent `Link` from navigating):

```tsx
// Line ~240 and ~250: Change from:
onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
// To:
onClick={(e) => { e.stopPropagation(); }}
```

This single change fixes both the ProductDetail share button and the ProductCard share icon.

| File | Change |
|------|--------|
| `src/components/ProductShare.tsx` | Remove `e.preventDefault()` from both DialogTrigger onClick handlers (lines ~240, ~250) |

