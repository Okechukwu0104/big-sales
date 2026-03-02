

# More Elaborate AI Descriptions + Fix Existing Poor Descriptions

## Problem

1. The AI prompt asks for "2-3 sentences" which produces thin descriptions. Some existing products have even worse manually-entered descriptions like "Also Designed for baking", "Very effective", "Very strong And active".
2. Several existing products need their descriptions regenerated.

## Changes

### 1. Update AI prompt for richer descriptions

**File: `supabase/functions/ai-generate-product/index.ts`**

Change the description guidance from "2-3 sentences" to "4-5 sentences" in three places:
- **System prompt**: Change "Write descriptions as a professional seller would, highlighting features visible in the image" to include instructions for elaborate descriptions covering: what the product is, key features/specs, material/build quality, use cases, and why the buyer should want it.
- **User prompt**: Change "a compelling 2-3 sentence description" to "a detailed 4-5 sentence product description covering features, specs, materials, use cases, and benefits"
- **Tool parameter `description`**: Update from "2-3 sentences" to "A detailed, elaborate product description of 4-5 sentences. Cover: what the product is, key features and specifications, material/build quality, ideal use cases, and a compelling reason to buy. Write as a professional e-commerce seller."

### 2. Add "Regenerate Descriptions" admin feature

**File: `src/pages/admin/Products.tsx`**

Add a button in the admin toolbar: "Fix Descriptions" (with Sparkles icon). When clicked:
- Queries all products where `description` is null, empty, or shorter than 80 characters (catches the thin ones)
- For each product that has an `image_url`, sends the image to the `ai-generate-product` edge function to get a new elaborate description
- Updates only the `description` field in Supabase (preserves name, price, etc.)
- Processes sequentially with 1s delays, shows progress toast
- Products without images get a generic enhanced description based on their name via a simple text-only AI call

This is a one-time cleanup tool. Implementation:
- New state: `isFixingDescriptions` boolean
- New function: `handleFixDescriptions()` that fetches image URLs, calls AI, updates DB
- Button shown in the toolbar area near "Add Product" and "Bulk Upload"
- Progress shown as toast updates: "Fixing 3/7..."

### 3. Edge function update to also accept a `mode` parameter

**File: `supabase/functions/ai-generate-product/index.ts`**

Add support for an optional `imageUrl` parameter (in addition to `imageBase64`) so we can pass existing product image URLs for re-analysis. Also add an optional `nameHint` parameter so the AI can use the existing product name as context when regenerating just the description.

When `imageUrl` is provided instead of `imageBase64`, fetch the image, convert to base64, then proceed as normal.

## Technical Details

Products needing fixes (description < 80 chars or clearly poor):
- "Kenwood Airfryer" → "Also Designed for baking"
- "IMG-20260217-WA0036(1)" → "Very effective"
- "Quides Super Blender" → "Qiudes super blender Very strong And active"
- "Borosilicate Beautiful Glass Kettle" → has price info in description
- "Wooden Wardrobe" → has raw pricing text in description
- "Portable Outdoor Stainless Steel Mug" → single long sentence, could be better

| File | Changes |
|------|---------|
| `supabase/functions/ai-generate-product/index.ts` | Longer description prompts (4-5 sentences), support `imageUrl` + `nameHint` params |
| `src/pages/admin/Products.tsx` | "Fix Descriptions" button + logic to regenerate poor descriptions via AI |

