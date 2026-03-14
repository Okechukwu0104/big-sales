

# Fix AI Descriptions + Product Share Button with QR Code

## Part 1: Fix AI Description Quality

### Edge Function Update (`supabase/functions/ai-generate-product/index.ts`)
The current prompt already asks for 4-5 sentences, but descriptions are still coming out thin. Strengthen with:
- Add explicit **minimum word count** instruction: "Write AT LEAST 60 words"
- Add example output in the system prompt so the AI sees what a good description looks like
- Add to tool parameter: "MINIMUM 60 words. Must cover: 1) What the product is 2) Key specs/features 3) Material/build quality 4) Who it's for and use cases 5) Why buy it"

### Fix Existing Descriptions (`src/pages/admin/Products.tsx`)
The `handleFixDescriptions` threshold is 80 chars. Some poor descriptions might be longer but still bad (e.g. product pricing text pasted in). Update:
- Increase threshold to 120 chars to catch more thin descriptions
- Also fix descriptions containing raw price text (regex for "₦" or "naira" patterns)
- Also fix names that still contain "IMG-" patterns by updating the name alongside the description

## Part 2: Product Share Button with Branded QR Code

### New Component: `src/components/ProductShare.tsx`

A share button on the ProductDetail page and ProductCard that opens a dialog containing:

1. **Branded QR Code Sticker** — a visually designed card with:
   - Brown patterned background (using the existing `bg-pattern.avif`)
   - BIG SALES logo centered above or below the QR code
   - QR code generated using a lightweight canvas-based generator (no external library — use the native `qrcode` approach or a small inline QR encoder)
   - Attractive text: "Scan to shop!" / product name / price
   - Download button to save as image (using `html2canvas` pattern via canvas export)

2. **Social Media Share Links**:
   - WhatsApp (with pre-filled message including product link, name, price)
   - Facebook share
   - Twitter/X share
   - Copy link button
   - Native share (Web Share API where supported)

### QR Code Generation
Use a lightweight inline QR code generator function (no npm dependency needed — there are well-known ~100-line canvas-based QR implementations). Alternatively, use a tiny library. I'll implement a canvas-based QR renderer to keep bundle size minimal and work offline.

Actually, to keep it professional and reliable, I'll use the `qrcode` npm package (small, well-maintained) for generating QR as data URL, then composite it onto the branded sticker canvas.

### Sticker Design (canvas-rendered, downloadable)
```text
+----------------------------------+
|  [brown patterned background]    |
|                                  |
|     🏷️ BIG SALES                |
|     [QR CODE]                    |
|                                  |
|   "Kenwood Air Fryer 5L"        |
|       ₦15,000                    |
|   ✨ Scan to Shop Now! ✨        |
+----------------------------------+
```

### Integration Points
- **ProductDetail.tsx**: Add a Share button (Share2 icon) next to the Like button
- **ProductCard.tsx**: Add a small share icon button in the card footer or overlay

### Files to Create/Modify

| File | Changes |
|------|---------|
| `supabase/functions/ai-generate-product/index.ts` | Stronger description prompt with min word count + example |
| `src/pages/admin/Products.tsx` | Increase fix threshold to 120 chars, also fix IMG- names |
| `src/components/ProductShare.tsx` | New component: share dialog with QR sticker + social links |
| `src/pages/ProductDetail.tsx` | Add Share button |
| `src/components/ProductCard.tsx` | Add share icon |
| `package.json` | Add `qrcode` package for QR generation |

