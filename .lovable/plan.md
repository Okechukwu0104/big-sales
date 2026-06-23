
# SEO Enhancement Plan — bigsales.ng

The site already has a strong baseline (rich JSON-LD Organization + WebSite + FAQ, OG/Twitter cards, dynamic product sitemap with images, AI-bot-friendly robots.txt, per-product Helmet with Product + BreadcrumbList schema). This plan closes the remaining gaps that actually move rankings and click-through.

## 1. Fix forbidden phrase (compliance + brand)

Project rule: never mention "Pay on Delivery" explicitly. It currently appears in:
- `index.html` `<title>`, `<meta description>`, OG description, Twitter description
- `index.html` FAQ JSON-LD (Question 1 + Q5 hints)
- `Organization` JSON-LD `paymentAccepted`

Replace with neutral, conversion-friendly phrasing: "Secure Checkout · Fast Nationwide Delivery". Rewrite FAQ Q1 to focus on "How do I pay safely on BIG SALES?" with WhatsApp-confirmed checkout language. Remove `"Cash on Delivery"` from `paymentAccepted`.

## 2. Strengthen Product rich results (biggest ranking lever)

`ProductDetail.tsx` already emits Product + Offer + Breadcrumb JSON-LD. Add the fields Google now requires/prefers for the Product rich result and Merchant listings:

- `aggregateRating` + `reviewCount` — pull from existing `reviews` table (already aggregated on the page).
- `review` array (top 3 reviews) — uses existing review data.
- `priceValidUntil` (90 days out).
- `hasMerchantReturnPolicy` + `shippingDetails` (required by Google for the price rich result in 2025).
- Real `brand.name` from `product.brand` field (fallback to "BIG SALES").
- `gtin`/`mpn` skipped (not in schema).

## 3. Per-route Helmet for `/`, `/track-order`, `/cart`

Currently only `ProductDetail` overrides head tags. Add `<Helmet>` blocks to:

- **Home** (`src/pages/Home.tsx`): keep the rich `index.html` defaults but emit a `CollectionPage` + `ItemList` JSON-LD of the visible featured products so the homepage qualifies for product carousels in SERPs.
- **TrackOrder**: unique title/description, `noindex` (utility page).
- **Cart**: `noindex`.

## 4. Trim and refocus the keywords meta

The current `keywords` meta is ~240 terms — harmless but signals spammy to some quality systems. Trim to ~25 high-intent Nigerian terms aligned with actual product catalog. Bing still reads this tag; tight lists perform better.

## 5. Internal sitemap polish

`supabase/functions/sitemap-xml/index.ts` already lists products. Add:
- `<priority>1.0</priority>` for homepage (already 1.0 — confirm)
- Filter out products where `in_stock = false` AND `quantity = 0` so search engines stop spending crawl budget on dead URLs.
- Add a category-style synthetic URL set if categories are user-browsable routes (skip if not — confirm there are no `/category/:slug` routes; today there aren't, so this is a future step only).

## 6. Image alt-text audit

Verify `ProductCard` and `ProductDetail` `<img>` tags use `alt={product.name}`. If any are missing or generic ("product image"), update them. (Will check during build.)

## 7. Submit sitemap to Google Search Console

Not a code change — final step is for the user to (a) verify the property if not already done (the `google-site-verification` meta is in place, so it should be one-click), and (b) submit `https://bigsales.ng/sitemap.xml`. Will include this as the closing instruction.

---

## Out of scope (ask first if you want them)

- Per-category landing pages with SEO copy (needs new routes + content)
- Blog / content marketing engine
- AMP, SSR/SSG migration (would require leaving Vite SPA)
- Backlink outreach

## Files touched

- `index.html` — fix forbidden phrase, trim keywords, fix paymentAccepted, rewrite FAQ Q1
- `src/pages/ProductDetail.tsx` — enrich Product JSON-LD
- `src/pages/Home.tsx` — add Helmet + ItemList JSON-LD
- `src/pages/TrackOrder.tsx`, `src/pages/Cart.tsx` — add noindex Helmet
- `supabase/functions/sitemap-xml/index.ts` — exclude out-of-stock items

Ready to implement on approval.
