

# Fix Search Dropdown Overlap & Mobile Responsiveness

## Problem
The search dropdown is clipped/overlapping because it's rendered **inside** the `relative` div that contains the animated glow ring (line 320 of Home.tsx). The dropdown's `absolute top-full` positions relative to that inner div, but the content below (trust badges at `z-10`) overlaps it.

## Fix

### 1. Search Dropdown Clipping Fix (`src/pages/Home.tsx`)
- Move the `InstantSearchDropdown` **outside** the glow ring wrapper div (the `relative transition-all` div at line 320), but keep it inside the `searchContainerRef` div (line 319) which already has `relative z-20`
- This ensures the dropdown positions correctly from the outer container and stays above all content below

### 2. Mobile Responsiveness Audit & Fixes

| File | Issue | Fix |
|------|-------|-----|
| `src/pages/Home.tsx` | Hero padding too large on mobile; search bar text/padding oversized | Reduce `py-10` to `py-6` on mobile; reduce input `py-5` to `py-4` on mobile; scale heading down |
| `src/pages/Checkout.tsx` | Missing `pt-20` for header offset; empty cart missing `pt-24` | Add `pt-20` to main content |
| `src/pages/OrderSuccess.tsx` | Missing `pt-20` for header offset | Add `pt-20` to main content |
| `src/pages/TrackOrder.tsx` | Missing `pt-20` for header offset; heading too large on mobile | Add `pt-20`; scale heading from `text-4xl` to `text-2xl sm:text-4xl` |
| `src/components/InstantSearchDropdown.tsx` | Dropdown uses `overflow-hidden` which clips the scrollable content; needs `max-height` + scroll for many results on mobile | Add `max-h-[60vh] overflow-y-auto` to the results container |

### File Changes

| File | Changes |
|------|---------|
| `src/pages/Home.tsx` | Move dropdown outside glow wrapper; mobile-optimize hero spacing |
| `src/components/InstantSearchDropdown.tsx` | Add max-height + scroll so all results are visible on mobile |
| `src/pages/Checkout.tsx` | Add `pt-20` header offset |
| `src/pages/OrderSuccess.tsx` | Add `pt-20` header offset |
| `src/pages/TrackOrder.tsx` | Add `pt-20` header offset; responsive heading size |

