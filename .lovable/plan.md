
Permanent mobile fix plan

What I found
- The biggest likely source of “glitches” is the fixed header: on mobile it is taller because it has the extra search row, but page spacing is inconsistent across routes.
  - `Home.tsx` uses `pt-20`
  - `Cart.tsx` / `ProductDetail.tsx` use larger top padding
  - `Checkout.tsx`, `OrderSuccess.tsx`, and `TrackOrder.tsx` have little or no header offset
  This can cause content to sit under the header, jump, or feel broken on mobile.
- There are also a few layout-overflow risks on mobile:
  - carousel/category arrow buttons are positioned partly outside containers
  - the footer newsletter form stays in one row with a fixed-width button
  - multiple floating buttons can compete for space with the flash-deals drawer
- The flash deals popup is improved already, but not fully “permanent” yet because the drawer shell itself still needs stricter mobile height/overflow handling.
- The “Browse Categories” action still relies on a short timeout, which can be unreliable on slower/mobile devices.

What I will change
1. Create one shared mobile-safe page offset system
- Add a reusable top-spacing utility in `src/index.css` for all pages that use the fixed `Header`.
- Apply the same safe header offset to:
  - `src/pages/Home.tsx`
  - `src/pages/Cart.tsx`
  - `src/pages/Checkout.tsx`
  - `src/pages/OrderSuccess.tsx`
  - `src/pages/TrackOrder.tsx`
  - `src/pages/ProductDetail.tsx`
- This removes header overlap and inconsistent page jumps permanently.

2. Remove horizontal overflow sources
- Hide side arrow controls on small screens in:
  - `src/components/ProductSection.tsx`
  - `src/components/CategoryBrowser.tsx`
  Touch swipe will remain the mobile interaction.
- Keep desktop arrows visible but move them fully inside the container.
- Add a final overflow safeguard on the main app/page wrapper so tiny translated elements cannot create sideways scrolling.

3. Make flash deals truly mobile-safe
- Tighten the mobile drawer behavior in:
  - `src/components/ui/drawer.tsx`
  - `src/components/ProductSuggestionPopup.tsx`
- Changes:
  - cap drawer height to viewport
  - make header/body areas scroll correctly
  - add safe bottom padding
  - keep card content smaller and wrap-proof on narrow screens
  - prevent CTA rows and price badges from forcing width overflow

4. Stabilize floating mobile actions
- Review the three fixed mobile actions:
  - scroll-to-top
  - FAQ/help
  - WhatsApp contact
- Reposition or reduce them on small screens so they never clash with each other or with the flash-deals drawer.

5. Make “Browse Categories” reliable
- Replace the timeout-based scroll in `src/pages/Home.tsx` with a more reliable ref/effect-based scroll after the home view is active.
- This ensures tapping “Browse Categories” always lands on the `Browse by Category` section, including on slower phones.

6. Reduce mobile layout shifts in the header
- In `src/components/Header.tsx`, reserve stable space for the support/help action so the header does not shift when store config finishes loading.
- Keep the mobile search row compact and consistent.

7. Fix remaining obvious mobile offenders
- `src/components/Footer.tsx`: stack the newsletter input/button vertically on mobile and remove the forced button width there.
- Do a small responsive cleanup pass on:
  - `src/components/TrustBadges.tsx`
  - `src/components/TestimonialCarousel.tsx`
  - `src/components/HowItWorks.tsx`
  so text blocks/cards feel tighter and cleaner on mobile.

Technical approach
- Prefer shared utilities over page-by-page padding hacks.
- Prefer hiding decorative desktop controls on mobile instead of squeezing them.
- Use viewport-safe sizing (`dvh`/max-height) for drawers and overlays.
- Replace timer-based navigation with state/ref-driven scrolling.
- Keep the fixes structural so the same bugs do not reappear when sections change later.

Files likely involved
- `src/index.css`
- `src/components/Header.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ProductSuggestionPopup.tsx`
- `src/components/ProductSection.tsx`
- `src/components/CategoryBrowser.tsx`
- `src/components/Footer.tsx`
- `src/pages/Home.tsx`
- `src/pages/Cart.tsx`
- `src/pages/Checkout.tsx`
- `src/pages/OrderSuccess.tsx`
- `src/pages/TrackOrder.tsx`
- `src/pages/ProductDetail.tsx`
