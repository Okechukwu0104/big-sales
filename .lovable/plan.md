

# Trending Products Carousel in Hero Section

## What Changes

Replace the current single featured product image on the right side of the hero with a **carousel of the top 3 most trending products** (sorted by `likes_count`). Each slide shows the product's image or auto-playing video, with a "Trending Now" overlay badge showing the product name and price. Clicking navigates to the product.

## How

### File: `src/pages/Home.tsx`

**1. Compute trending products**
- Add a `trendingProducts` memo that sorts all products by `likes_count` descending, takes the top 3

**2. Replace the static featured image (lines 411-447) with a carousel**
- Use Embla carousel (already installed) with `autoplay` loop, 4-second interval
- Each slide renders:
  - If `video_url` exists: `<video>` tag with `autoPlay`, `muted`, `loop`, `playsInline` — plays continuously
  - If image only: `<img>` tag as before
  - Bottom overlay badge: "Trending Now 🔥", product name, formatted price, arrow button linking to `/product/:id`
- Add dot indicators below the carousel for the 3 slides
- Keep the existing orange glow behind the card, rounded corners, and border styling

**3. Carousel animation**
- Smooth fade/slide transition between products
- On mobile, the carousel stacks below the text (existing responsive layout)

### Visual Layout (same frame as reference image)
```text
+----------------------------------+
| [orange glow behind]             |
| ┌──────────────────────────────┐ |
| │  product image / video       │ |
| │  (auto-playing if video)     │ |
| │                              │ |
| │  ┌────────────────────────┐  │ |
| │  │ Trending Now 🔥        │  │ |
| │  │ Product Name     [→]  │  │ |
| │  │ ₦15,000               │  │ |
| │  └────────────────────────┘  │ |
| └──────────────────────────────┘ |
|         ● ○ ○  (dots)           |
+----------------------------------+
```

### Dependencies
- No new packages needed — Embla carousel already installed

| File | Changes |
|------|---------|
| `src/pages/Home.tsx` | Add `trendingProducts` memo, replace static hero image with Embla carousel of top 3 trending products with video/image support and dot navigation |

