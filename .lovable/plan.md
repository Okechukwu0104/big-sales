

## Goal
When users share a product link (via WhatsApp, Facebook, Twitter, iMessage, etc.), the link preview should show the product image (or video thumbnail) alongside the existing description — instead of a generic site preview.

## How Link Previews Work
Social platforms scrape the page's `<meta>` tags (Open Graph + Twitter Card) when a link is pasted. They look for:
- `og:image` → preview image
- `og:title`, `og:description` → text
- `og:video` → video preview (supported by Facebook, WhatsApp partial)
- `twitter:card`, `twitter:image` → Twitter/X preview

**The Challenge:** This is a React SPA (client-side rendered). The `index.html` has static meta tags that apply to ALL pages. When a scraper visits `/product/abc123`, it only sees the generic homepage tags — not the product's image.

## Solution: Supabase Edge Function for SSR Meta Tags

Create an edge function that detects social media crawlers and serves a minimal HTML page with product-specific Open Graph tags. Regular users continue to get the React app as normal.

### Architecture
```text
User clicks link → Browser → React app (normal)
WhatsApp/FB scraper → Edge function → Static HTML with og:image/og:video
```

### Implementation

**1. New edge function: `supabase/functions/product-meta/index.ts`**
- Accepts `?id=<product-id>` query param
- Fetches product from Supabase (name, description, image_url, video_url, price)
- Returns HTML with full Open Graph + Twitter Card tags including:
  - `og:image` = product.image_url (or video thumbnail if only video exists)
  - `og:video` = product.video_url (if present)
  - `og:title` = product name
  - `og:description` = product description (or auto-generated from name + price)
  - `og:url` = canonical product URL
  - `twitter:card` = "summary_large_image"
- Includes a `<meta http-equiv="refresh">` redirect so if a real user lands here, they're sent to the SPA

**2. Update `vercel`/hosting routing — but since this is Lovable-hosted, use a different approach:**

Since we can't intercept routes at the edge for the Lovable-hosted SPA, we'll instead:
- Update `ProductShare.tsx` to use a special share URL format: `https://<supabase-project>.supabase.co/functions/v1/product-meta?id=<id>` for the **shared link**
- That edge function URL serves OG tags to scrapers AND redirects real users to `/product/:id` on the main site
- Update copy/share buttons (WhatsApp, Facebook, Twitter, native share) to use this share URL instead of the direct product URL

**3. Update `src/components/ProductShare.tsx`**
- Build `shareUrl` pointing to the edge function endpoint
- Use `shareUrl` for: WhatsApp, Facebook, Twitter, native share, and copy-link
- Keep the QR code and on-page logic unchanged (QR can still point to the direct product URL since it's scanned by humans)

**4. Update `index.html` defaults** — improve fallback OG tags for the homepage

### Files

| File | Changes |
|------|---------|
| `supabase/functions/product-meta/index.ts` | NEW: serves product-specific OG/Twitter meta HTML, redirects browsers to SPA |
| `supabase/config.toml` | Register `product-meta` function as public (no JWT verification) |
| `src/components/ProductShare.tsx` | Use edge function URL for shared links so previews work on WhatsApp/FB/X |
| `index.html` | Polish default OG tags as fallback |

### Notes
- WhatsApp/Facebook cache previews aggressively — first share may take a moment; re-shares show instantly
- Video previews work on Facebook/Twitter; WhatsApp shows the image thumbnail instead
- This requires no database changes

