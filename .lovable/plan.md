

# Fix AI Product Generation: Better Prompts + TypeScript Errors

## Problem

1. The AI is generating nonsensical product names like "Black and White Abstract Artwork" for a Kenwood air fryer, and using raw filenames like "IMG-20260217-WA0059(1)" instead of identifying the actual product (a glass coffee teapot). The system prompt is too vague.

2. Two TypeScript build errors: `err` and `error` are typed as `unknown` in Deno strict mode.

## Changes

### File: `supabase/functions/ai-generate-product/index.ts`

**1. Improve the system prompt** to be much more explicit about:
- Looking at the ACTUAL product in the image, not watermarks, backgrounds, or text overlays
- Never using filenames, watermarks (like "TikTok"), or unrelated text as the product name
- Identifying the brand, model, and product type from visual cues
- Writing a real e-commerce product title (e.g. "Kenwood Digital Air Fryer" not "Black and White Abstract Artwork")
- Writing a seller-style description that highlights features visible in the image

**2. Improve the user prompt** to reinforce:
- "Ignore any watermarks, overlays, or text that is not part of the product itself"
- "The product name should describe what the physical product IS"

**3. Improve tool parameter descriptions** to be more constraining:
- `name`: "The actual product name based on what the physical item is. Include brand if visible. Never use filenames, watermarks, or unrelated text. Example: 'Kenwood Digital Air Fryer 5L' not 'Black and White Abstract Artwork'"
- `description`: "A compelling product description highlighting key features visible in the image. Write as an e-commerce seller would. 2-3 sentences."

**4. Fix TypeScript errors** by casting `err` and `error`:
- Line 146: `if ((err as Error).name === "AbortError")`
- Line 169: `error: (error as Error).message || "Failed to analyze image"`

## Technical Details

The root cause of bad names is the AI latching onto visual noise (watermarks, background text, color descriptions) instead of identifying the actual product. A stronger, more constrained prompt with explicit negative instructions ("NEVER use filenames", "IGNORE watermarks") and better tool parameter descriptions will fix this.

| File | Changes |
|------|---------|
| `supabase/functions/ai-generate-product/index.ts` | Improved prompts, better tool descriptions, TypeScript error fixes |

