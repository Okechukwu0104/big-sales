## Goal
Make BIGSALES.ng (and every product page) fully discoverable by Google, Bing, and AI crawlers (ChatGPT, Perplexity, Claude, Gemini), so searches like the product name surface the BIG SALES product page.

## Why current setup is weak
- `sitemap.xml` is static — only lists `/`, `/cart`, `/checkout`. No products = nothing for Google to index.
- Product pages are client-rendered React. Crawlers that don't run JS (GPTBot, ClaudeBot, PerplexityBot, plus partial Googlebot) see an empty shell.
- `product-meta` edge function only serves rich previews to social crawlers (WhatsApp/FB). Search-engine crawlers fall through to the SPA via `vercel.json`.
- Canonical URLs point to `big-sales.lovable.app`, not `BIGSALES.ng`.
- No JSON-LD structured data (no Product schema → no rich results, no price/stock badges in Google).
- `robots.txt` doesn't whitelist AI crawlers and points sitemap to wrong host.

## Plan

### 1. Switch canonical domain to `https://bigsales.ng`
- Update `SITE_ORIGIN` in `supabase/functions/product-meta/index.ts`.
- Update `public/robots.txt` sitemap URL.
- Update `index.html` OG tags.
- Add `<link rel="canonical">` via Helmet on Home and ProductDetail.
- Note: user must connect `bigsales.ng` in Project Settings → Domains for this to resolve.

### 2. Dynamic sitemap edge function (`sitemap-xml`)
New public edge function that queries all in-stock products and returns a fresh XML sitemap:
- `/` (priority 1.0)
- `/track-order`, `/cart` (0.6)
- `/product/{id}` for every active product (priority 0.8, `lastmod` = `updated_at`, includes `<image:image>` block with product image for Google Image search)
- Cached `s-maxage=3600`.
- Add `vercel.json` rewrite: `/sitemap.xml` → edge function. Remove the static `public/sitemap.xml` (or leave as fallback).

### 3. Server-rendered product page for ALL crawlers (not just social)
Extend `product-meta` to also serve search-engine + AI crawlers with full HTML:
- Detect crawler UA list expanded to: `googlebot, bingbot, duckduckbot, yandexbot, baiduspider, applebot, gptbot, oai-searchbot, chatgpt-user, claudebot, claude-web, perplexitybot, perplexity-user, google-extended, anthropic-ai, ccbot, bytespider, amazonbot, mistralai-user, cohere-ai`.
- Render full crawlable HTML body (not just meta): `<h1>` product name, price, description, image, breadcrumbs, related links — so AI assistants can summarize and cite the page.
- Inject **JSON-LD `Product` schema** with name, image, description, sku, brand, offers (price, priceCurrency NGN, availability, url), aggregateRating if reviews exist.
- Real users keep the JS redirect to the SPA.
- Update `vercel.json` `/product/:id` rewrite to match the expanded crawler regex.

### 4. JSON-LD on the SPA too (defense in depth)
- Add `Organization` + `WebSite` + `SearchAction` JSON-LD in `index.html`.
- Add `Product` JSON-LD via Helmet inside `ProductDetail.tsx` for crawlers that do execute JS (modern Googlebot).
- Add `BreadcrumbList` JSON-LD on product pages.

### 5. Per-page meta with Helmet
- `Home.tsx`: title "BIG SALES — Shop Online in Nigeria | Fast Delivery", description, canonical `https://bigsales.ng/`.
- `ProductDetail.tsx`: dynamic `<title>{product.name} – ₦{price} | BIG SALES</title>`, description from product, OG tags, canonical `https://bigsales.ng/product/{id}`.

### 6. robots.txt
Rewrite to explicitly allow AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.), point sitemap to `https://bigsales.ng/sitemap.xml`.

### 7. Submission checklist (manual, after deploy)
After publish I'll give the user steps to:
- Verify domain in Google Search Console + Bing Webmaster Tools.
- Submit `https://bigsales.ng/sitemap.xml`.
- Request indexing for the homepage.

## Files to change / create
- `supabase/functions/product-meta/index.ts` — expand crawler detection, add full body HTML + JSON-LD.
- `supabase/functions/sitemap-xml/index.ts` — **new**, dynamic sitemap.
- `supabase/config.toml` — register `sitemap-xml` with `verify_jwt = false`.
- `vercel.json` — add `/sitemap.xml` rewrite, expand crawler UA regex on `/product/:id`.
- `public/robots.txt` — AI crawler whitelist + correct sitemap URL.
- `public/sitemap.xml` — delete (replaced by edge function) or keep as static fallback.
- `index.html` — global JSON-LD (Organization/WebSite), update OG URL.
- `src/pages/Home.tsx` — Helmet meta + canonical.
- `src/pages/ProductDetail.tsx` — Helmet dynamic meta + Product JSON-LD + Breadcrumb JSON-LD.

## Out of scope / user action required
- Connecting `bigsales.ng` DNS in Project Settings → Domains.
- Google Search Console + Bing Webmaster verification + sitemap submission (I'll provide instructions).
