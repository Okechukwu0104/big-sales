

# Fix Page Glitches + Mobile-Responsive Flash Deals

## Issues Found

1. **Hero text glitch**: Line 438 in `Home.tsx` has literal `/n` instead of a line break — shows "For FREE! /n Premium products" on screen
2. **Bundle pricing bug**: In `ProductSuggestionPopup.tsx` line 75, `bundlePrice = sumOfAllThree * 1.10` means the bundle costs MORE than buying items separately — this is the opposite of a deal. Should be `* 0.85` (15% discount)
3. **Flash deals drawer not mobile-responsive**: The grid uses `grid gap-3 sm:grid-cols-2` which means single column on mobile, but the cards themselves are too wide/tall. The drawer also lacks `max-h` and scroll, so content can overflow off-screen
4. **Bundle image z-index uses dynamic Tailwind classes** (`z-${10-i}`) which don't work with Tailwind's JIT compiler — images won't layer correctly

## Changes

### 1. Fix hero text (`src/pages/Home.tsx`, line 438)
- Replace `/n` with `<br />` to create an actual line break, or just remove it and use two separate `<p>` tags

### 2. Fix bundle pricing (`src/components/ProductSuggestionPopup.tsx`, line 75)
- Change `Math.round(sumOfAllThree * 1.10)` → `Math.round(sumOfAllThree * 0.85)`
- Update `percentageOff` to actually show `15` (since we're giving 15% off the bundle)

### 3. Make flash deals mobile-responsive (`src/components/ProductSuggestionPopup.tsx`)
- Add `max-h-[70vh] overflow-y-auto` to the drawer content wrapper so it scrolls on mobile
- Make bundle cards more compact on mobile: smaller avatar images (`h-10 w-10`), tighter padding (`p-2`), smaller text
- Fix dynamic z-index: replace `z-${10-i}` with inline `style={{ zIndex: 10-i }}`
- Reduce "Bundle Offer!" text and description size on mobile

### 4. Fix any other z-index/Tailwind JIT issues
- The dynamic class pattern `z-${10-i}` won't be in the safelist — switch to inline styles

| File | Changes |
|------|---------|
| `src/pages/Home.tsx` | Fix `/n` → `<br />` in hero description text |
| `src/components/ProductSuggestionPopup.tsx` | Fix bundle price (0.85x not 1.10x), add percentageOff calc, mobile scroll/compact layout, fix dynamic z-index |

