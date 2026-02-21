
# Video Preview on Product Cards, Shorter Descriptions & Modern Nigerian-Focused Redesign

## Overview

Three interconnected changes to make the store feel premium and appealing to Nigerian shoppers:
1. Video preview on product cards (YouTube-style autoplay loop on hover)
2. Shorter product descriptions everywhere
3. Visual redesign with Nigerian market appeal -- bolder colors, Naira-forward pricing, urgency cues, and a more vibrant, marketplace-inspired feel

---

## Part 1: Video Preview on Product Cards

### How It Works

When a product has a `video_url` instead of (or alongside) an image, the product card will:
- Show the video thumbnail/first frame as the static preview
- On hover (desktop) or tap-hold (mobile), play the first ~10 seconds of the video in a silent, looping preview -- just like YouTube thumbnails
- Show a small "play" icon overlay so users know it's a video
- On the product detail page, show the full video player with controls

### File: `src/components/ProductCard.tsx`

- Add a `useRef` for the video element and a `isHovering` state
- In the card media area, check if `product.video_url` exists:
  - If yes, render a `<video>` element with `muted`, `loop`, `playsInline`, `preload="metadata"`
  - On `mouseEnter`: set `currentTime = 0`, call `play()`, and set a timeout to pause after 10 seconds
  - On `mouseLeave`: pause and reset to 0
  - Overlay a small play/video icon badge (bottom-right) to signal "this is a video"
- If both `image_url` and `video_url` exist, prefer video preview on hover with the image as the static poster frame
- If only `video_url` exists (no image), show the video element as the poster

### File: `src/pages/ProductDetail.tsx`

- Move the video player into the main media column (currently it sits outside the grid which breaks layout)
- Show image first, then video below it in the same column
- Add poster attribute using `image_url` if available

---

## Part 2: Shorter Product Descriptions

### File: `src/components/ProductCard.tsx`
- Change `line-clamp-2` to `line-clamp-1` for the description on desktop
- Keep it hidden on mobile (already `hidden sm:block`)

### File: `src/pages/ProductDetail.tsx`
- Truncate description to first 150 characters with a "Read more" toggle
- Show full description when expanded

### File: `src/components/ProductSection.tsx`
- No description shown in carousel cards (they're already compact)

---

## Part 3: Modern Nigerian-Focused Visual Redesign

### Design Philosophy
Nigerian e-commerce shoppers respond to:
- Bold, vibrant colors (green and gold -- national colors)
- Clear pricing in Naira prominently displayed
- Trust signals (verified, original, fast delivery)
- Social proof (likes, reviews count visible)
- Urgency and scarcity cues ("selling fast", "only X left")
- WhatsApp integration as a primary communication channel
- Mobile-first design (majority of Nigerian shoppers use mobile)

### 3a. Color System Update

**File: `src/index.css`**

Refresh the color palette to be more vibrant and Nigerian-market appropriate:
- Primary: Keep orange (it's already strong and associated with deals/sales)
- Accent: Shift from deep green to a richer Nigerian green (`145 63% 42%`) -- the green from the Nigerian flag
- Add a gold accent for premium feel (`45 93% 47%`)
- Warmer card backgrounds with subtle gradients
- Add new CSS utility class `.naira-price` for bold, attention-grabbing price styling
- Add a `.badge-hot` class with red/orange gradient for "Hot Deal" badges
- Add subtle green-white-green color bar (Nigerian flag colors) as a decorative element

### 3b. Product Card Redesign

**File: `src/components/ProductCard.tsx`**

Modern card redesign:
- Add a "HOT" or "New" badge with fire emoji for new arrivals (products created within last 7 days)
- Price displayed bigger and bolder with Naira symbol prominent
- Add a subtle "Original Product" or "Verified" trust badge
- Discount-style pricing: if there's no discount, still show price confidently in green
- Add "Add to Cart" icon-only button on mobile (saves space)
- "Buy Now" button with a green accent gradient (action color)
- Likes count shown as a small heart counter
- Reviews stars shown more compactly
- Smooth hover animation: card lifts with a colored shadow

### 3c. Home Page Modernization

**File: `src/pages/Home.tsx`**

- Hero section: Add a green-white-green subtle stripe at top (Nigerian flag nod)
- "Flash Deals" label with animated countdown-style feel (pulsing dot)
- Category pills: rounder, more colorful, with emoji icons
- Section headers: bolder with colored accent line underneath
- Footer area: add "Proudly Nigerian" badge with flag colors
- Add a "Free Delivery in Lagos" or similar localized trust badge (configurable from store config)

### 3d. Header Polish

**File: `src/components/Header.tsx`**

- Add a thin green-white-green stripe at the very top of the page (1-2px each color)
- Cart button: show total price alongside item count
- More prominent WhatsApp support button with green WhatsApp color

### 3e. Trust Badges Nigerian Focus

**File: `src/components/TrustBadges.tsx`**

Update copy to resonate with Nigerian shoppers:
- "100% Original Products" (combats counterfeit concerns)
- "Nationwide Delivery" (instead of generic "Fast Delivery")
- "Pay on Delivery Available" (popular in Nigeria)
- "WhatsApp Support" (preferred communication channel)
- Use the Nigerian green color for trust-related icons

### 3f. Testimonial Section Polish

**File: `src/components/TestimonialCarousel.tsx`**

- Show "Verified Purchase" badge in green
- Add location to reviewer display (e.g. "Lagos, Nigeria")
- Warmer background gradient

---

## Technical Details

### Video Autoplay Constraints
Browsers require videos to be `muted` for autoplay without user interaction. The implementation uses:
- `muted` attribute (required for autoplay)
- `playsInline` (prevents fullscreen on mobile)
- `preload="metadata"` (only loads the first frame initially, saves bandwidth)
- JavaScript `play()` on hover with a 10-second timeout
- `poster` attribute set to `product.image_url` for instant display before video loads

### Performance Considerations
- Videos only load metadata initially (not the full video)
- Video playback only triggers on hover (desktop) -- no autoplay on mobile to save data
- On mobile, a tap on the card navigates to the product page where the full video plays
- `loading="lazy"` on all images maintained
- Video elements use `preload="metadata"` to minimize bandwidth on slow networks

### Files Modified

| File | Changes |
|------|---------|
| `src/components/ProductCard.tsx` | Video hover preview, shorter description, visual redesign with Nigerian market appeal |
| `src/pages/ProductDetail.tsx` | Fix video player layout, description truncation with "Read more" |
| `src/pages/Home.tsx` | Nigerian flag color accents, bolder section headers, "Proudly Nigerian" footer |
| `src/components/Header.tsx` | Green-white-green top stripe, enhanced WhatsApp button |
| `src/components/TrustBadges.tsx` | Nigerian-focused copy and green color scheme |
| `src/components/TestimonialCarousel.tsx` | Verified purchase badge, warmer styling |
| `src/index.css` | Updated color palette, new utility classes for Nigerian market styling |
