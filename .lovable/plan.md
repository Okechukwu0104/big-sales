# AI Bulk Product Creator + Discount Pricing System

## Overview

Two major features:

1. **AI Bulk Product Creator**: Upload up to 10 images/videos at once, AI analyzes each and generates complete product cards (name, description, price suggestion, category)
2. **Discount Pricing**: Add `original_price` and `discount_price` columns so products can show strikethrough original price alongside the discounted price

---

## Part 1: Database Migration

Add discount pricing columns to the `products` table:

```sql
ALTER TABLE products
  ADD COLUMN original_price numeric DEFAULT NULL,
  ADD COLUMN discount_price numeric DEFAULT NULL;
```

- `original_price`: the "was" price (shown with strikethrough)
- `discount_price`: the sale price (shown bold)
- When both are set, the frontend shows the discount UI
- `price` remains the canonical selling price (updated to match `discount_price` when a discount is active)

---

## Part 2: AI Bulk Product Creator Edge Function

**New file: `supabase/functions/ai-generate-product/index.ts**`

- Accepts a base64 image (or video thumbnail frame)
- Sends it to Lovable AI (Gemini 2.5 Flash -- supports image input) with tool calling to extract structured output:
  - `name`, `description`, `price` (suggested in Naira), `category`
- Returns the structured product data
- 20-second timeout with fallback defaults
- Handles 429/402 errors gracefully

**Config update: `supabase/config.toml**`

```toml
[functions.ai-generate-product]
verify_jwt = true
```

---

## Part 3: Bulk Upload UI in Admin Products

**File: `src/pages/admin/Products.tsx**`

Add a new "Bulk Upload" dialog button alongside "Add Product":

- File input accepting `image/*,video/*` with `multiple`, max 10 files
- On file selection:
  1. Show a grid preview of all selected files with thumbnails
  2. For each file, compress images client-side (reuse existing `compressImage`)
  3. For videos, extract a thumbnail frame using canvas + video element
  4. Send each image/thumbnail to `ai-generate-product` edge function sequentially (with 1s delay between to avoid rate limits)
  5. Display AI-generated product info (name, description, price, category) in editable fields per item
  6. Admin can review/edit any field before confirming
  7. "Create All" button processes them one by one: uploads media to storage, creates product records
- Progress bar showing "Processing 3/10..." with per-item status
- Low-network optimization: sequential processing (not parallel), retry with backoff, compressed images
- Offline support: if offline, queue all items to IndexedDB with media cached as ArrayBuffers

### UI Layout for Bulk Upload Dialog

```text
+------------------------------------------+
| Bulk Upload Products (0/10 selected)     |
+------------------------------------------+
| [Drop files or click to select]          |
| Max 10 images/videos                     |
+------------------------------------------+
| [Thumb1] Name: ___  Price: ___  [Edit]   |
|          Desc: ___  Cat: ___    [Remove] |
|          Status: ✅ AI Generated          |
+------------------------------------------+
| [Thumb2] Name: ___  Price: ___  [Edit]   |
|          Status: ⏳ Analyzing...          |
+------------------------------------------+
|        [Create All Products]              |
+------------------------------------------+
```

---

## Part 4: Discount Pricing in Product Types & Forms

### Types Update (`src/types/index.ts`)

Add to Product interface:

```typescript
original_price: number | null;
discount_price: number | null;
```

### Admin Form (`src/pages/admin/Products.tsx`)

- Add "Original Price" and "Discount Price" fields below the existing Price field
- Toggle: "Enable Discount" switch -- when on, shows original_price and discount_price inputs
- When discount is enabled, `price` is auto-set to `discount_price` value on save
- Validation: discount_price must be less than original_price

### Product Card (`src/components/ProductCard.tsx`)

When `original_price` and `discount_price` are both set:

```text
₦15,000  ₦8,500
 ~~~~     (bold green)
```

- Original price: `line-through text-muted-foreground text-xs`
- Discount price: `font-extrabold naira-price text-base`
- Show discount percentage badge: "43% OFF"

### Product Detail (`src/pages/ProductDetail.tsx`)

Same strikethrough/discount display but larger text.

---

## Part 5: Offline Queue Update

**File: `src/utils/offlineQueue.ts**`

Add `original_price` and `discount_price` to the `OfflineProduct` interface so bulk-created products with discounts can also be queued offline.

---

## Summary of Changes


| File                                              | Changes                                                         |
| ------------------------------------------------- | --------------------------------------------------------------- |
| `supabase/migrations/`                            | Add `original_price`, `discount_price` columns                  |
| `supabase/functions/ai-generate-product/index.ts` | New edge function for AI image analysis                         |
| `supabase/config.toml`                            | Add ai-generate-product function config                         |
| `src/types/index.ts`                              | Add discount fields to Product interface                        |
| `src/utils/offlineQueue.ts`                       | Add discount fields to OfflineProduct                           |
| `src/pages/admin/Products.tsx`                    | Bulk upload dialog, discount form fields, bulk creation logic   |
| `src/components/ProductCard.tsx`                  | Strikethrough original price + discount display + "% OFF" badge |
| `src/pages/ProductDetail.tsx`                     | Discount price display on detail page                           |


### Low-Network Strategy

- Images compressed before AI analysis (saves upload bandwidth)
- Sequential AI calls with 1s spacing (avoids rate limits)
- Retry with exponential backoff on failures
- Each product created independently (one failure doesn't block others)
- Full offline queue support via IndexedDB for all bulk items
- Video thumbnails extracted client-side (no video sent to AI)