

# Mobile Optimization + Stats Update + Low-Network Upload Improvements

## 1. Update Social Proof Stats (`src/components/SocialProofStats.tsx`)

Change the hardcoded counter values:
- Happy Customers: 2500 → **500**
- Orders Delivered: 5000 → **680**
- Cities Covered: 36 → **20**
- Add new stat: **Calendar icon, "2+ Years", "Years of Operation"**
- Remove the Average Rating stat (replace with Years of Operation)
- Make icons and text smaller on mobile: `w-10 h-10` icons instead of `w-14 h-14`, `text-2xl` instead of `text-3xl`, reduce padding to `py-8`

## 2. Make Hero Section Smaller on Mobile (`src/pages/Home.tsx`)

- Reduce hero padding on mobile: `py-10 sm:py-16 md:py-28` (from `py-16`)
- Make headline smaller on mobile: `text-[2rem]` (from `text-[2.6rem]`)
- Reduce trending product card max width on mobile and aspect ratio
- Reduce CTA button padding on mobile: `py-3` instead of `py-4`
- Shrink trust row icons and text on mobile
- Reduce marquee text size on mobile

## 3. General Mobile Responsiveness Check

- Ensure product sections, category browser, testimonials, FAQ, and footer all use appropriate mobile sizing
- The existing code already has good mobile patterns (2-col grids, responsive text) — focus on the hero and stats sections which are the biggest offenders based on the screenshot

## 4. Low-Network Product Upload Improvements (`src/pages/admin/Products.tsx`)

The current upload system already has:
- Image compression (iterative canvas)
- Retry with exponential backoff (3 retries)
- Offline queue with IndexedDB
- Online/offline detection

**Problem**: Line 437 throws immediately if `navigator.onLine` is false, but on very slow networks `navigator.onLine` may be `true` yet requests timeout. The retry mechanism handles this, but improvements needed:

- Increase `MAX_RETRIES` from 3 to **5** for better resilience on slow networks
- Increase initial `RETRY_DELAY` from 1000ms to **2000ms** to give slow networks more time
- Add a longer timeout tolerance — wrap fetch calls with AbortController timeout of 60 seconds
- Lower `MAX_IMAGE_DIMENSION` from 1200 to **800** to produce smaller files by default on slow networks
- Show more granular progress messages during retries (e.g., "Retrying upload... attempt 2/5")

| File | Changes |
|------|---------|
| `src/components/SocialProofStats.tsx` | Update stat values (500, 680, 20), replace rating with "2+ Years of Operation", reduce mobile sizing |
| `src/pages/Home.tsx` | Reduce hero section padding, font sizes, card sizes on mobile |
| `src/pages/admin/Products.tsx` | Increase retries to 5, increase retry delay, reduce default image dimension to 800, improve retry feedback messages |

