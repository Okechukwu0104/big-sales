

# Temu-Like Shopping Experience: Minimum Order, Shuffled Carousel, Product Suggestions

## Overview

Transform the shopping experience with Temu-inspired mechanics: enforce a minimum ₦10,000 cart value before checkout, shuffle the hero carousel products on each visit, fix the Browse Categories scroll, and add engaging product suggestion popups that create urgency and drive upsells.

## Changes

### 1. Fix Browse Categories Scroll
The `id="categories"` div already exists at line 581 of Home.tsx. The scroll target works but is inside the `viewMode === 'home'` conditional — if the user has switched to "all" view, the element doesn't exist. We'll ensure it always scrolls correctly by keeping the categories section visible or switching viewMode first.

**File: `src/pages/Home.tsx`**
- In the Browse Categories button handler (line 412-414), set `viewMode` to `'home'` first, then use a `setTimeout` to scroll after render.

### 2. Shuffle Hero Carousel Products
**File: `src/pages/Home.tsx`**
- Change `trendingProducts` memo (line 174-179) to shuffle the top products using Fisher-Yates shuffle instead of just taking top 3 sorted. Each page load/data refresh shows them in random order.

### 3. Minimum Order Threshold (₦10,000)
Temu requires a minimum purchase — we enforce ₦10,000.

**File: `src/pages/Cart.tsx`**
- Add a progress bar showing how close the user is to ₦10,000
- Show "Add ₦X more to checkout" message when below threshold
- Disable/grey out "Proceed to Checkout" button when under ₦10,000
- Add a "You might also like" section below with random discounted products to encourage adding more

**File: `src/pages/Checkout.tsx`**
- Add a guard: if `getTotalPrice() < 10000`, redirect back to cart with a toast

### 4. Product Suggestion Popup (Temu-style "Flash Deals")
A popup that appears after the user has been browsing for 15 seconds, or when they add an item to cart — showing 3-4 discounted products with urgency text like "Limited Time Deal" and fake countdown timers.

**New File: `src/components/ProductSuggestionPopup.tsx`**
- Modal/drawer that slides up from bottom on mobile, centered modal on desktop
- Shows 3-4 products that have `discount_price` set (actual discounts from DB)
- Each card shows: image, name, original price crossed out, discount price, % off badge
- "Add to Cart" button on each
- Triggers: 
  - 15 seconds after page load (once per session via sessionStorage flag)
  - After adding an item to cart (if cart total is still under ₦10,000, to encourage reaching threshold)
- Dismissable with X button
- Header: "🔥 Flash Deals — Don't Miss Out!"

**File: `src/pages/Home.tsx`**
- Import and render `ProductSuggestionPopup`
- Pass products list and a trigger state

**File: `src/components/ProductCard.tsx`**
- After `addToCart` call, dispatch a custom event or use a callback to trigger the suggestion popup if cart < ₦10,000

### 5. Cart Progress Bar Component
**Embedded in `src/pages/Cart.tsx`**
- Animated gradient progress bar (orange→green)
- Text: "Spend ₦X more to unlock checkout!" or "✓ You're ready to checkout!"
- When threshold met, confetti-style celebration text

## Technical Details

| File | Changes |
|------|---------|
| `src/pages/Home.tsx` | Fix Browse Categories scroll handler, shuffle trending products, render ProductSuggestionPopup |
| `src/pages/Cart.tsx` | Add min-order progress bar, disable checkout below ₦10,000, add "You might also like" section |
| `src/pages/Checkout.tsx` | Add ₦10,000 minimum guard with redirect |
| `src/components/ProductSuggestionPopup.tsx` | New — Temu-style flash deals popup with discounted products |
| `src/components/ProductCard.tsx` | Trigger suggestion popup after add-to-cart when cart < ₦10,000 |

No database changes needed — all logic uses existing product data (`discount_price`, `original_price` fields).

