
# Video Upload, AdSense Verification & Mobile Responsiveness Overhaul

## Overview

This plan covers three areas:
1. Admin video upload for products
2. AdSense verification and setup
3. Comprehensive mobile responsiveness improvements across the entire app

---

## Part 1: Admin Video Upload for Products

### Database Migration

Add a `video_url` column to the `products` table and create a `product-videos` storage bucket:

```sql
ALTER TABLE products ADD COLUMN video_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-videos', 'product-videos', true);

CREATE POLICY "Public video access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-videos');

CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-videos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-videos' AND
  has_role(auth.uid(), 'admin'::app_role)
);
```

### Type Update

**File: `src/types/index.ts`**
- Add `video_url: string | null;` to the `Product` interface

### Admin Products Form Changes

**File: `src/pages/admin/Products.tsx`**

Add video upload field below the image upload:
- New `video` field in `formData` state
- File input accepting `video/*` with 50MB limit
- Video upload logic in create/update mutations using `product-videos` bucket
- "Has Video" badge in product list
- Iterative image compression: reduce quality from 0.9 down to 0.1 in steps until image is under 5MB, then reduce dimensions to 800px as last resort

### Product Detail Video Player

**File: `src/pages/ProductDetail.tsx`**

Display a video player below the product image when `product.video_url` exists:
```
[Product Image]
[Video Player - controls, preload metadata]
```

---

## Part 2: AdSense Verification

### Current Status - Already Complete

The AdSense setup is already properly configured:
- AdSense script tag is in `index.html` head
- `<meta name="google-adsense-account">` tag is present
- `public/ads.txt` file exists with the correct publisher ID

Since this is an SPA (Single Page Application), the script in `index.html` head loads once and covers all routes. No additional changes needed for AdSense -- it is ready to serve ads once Google approves the account.

---

## Part 3: Mobile Responsiveness Improvements

### 3a. Product Cards - Smaller on Mobile

**File: `src/components/ProductCard.tsx`**

Current issues:
- `p-6` padding is too spacious on mobile
- `text-3xl` price is oversized on small screens
- `text-xl` product name is too large
- Button sizes are excessive on mobile

Changes:
- Padding: `p-6` becomes `p-3 sm:p-5`
- Product name: `text-xl` becomes `text-base sm:text-lg`
- Price: `text-3xl` becomes `text-xl sm:text-2xl`
- Description: hide on mobile (`hidden sm:block`)
- Footer padding: `p-6` becomes `p-3 sm:p-5`
- Buttons: `size="lg"` becomes `size="default"` on mobile via responsive classes
- Badges: reduce padding on mobile with `text-[10px] sm:text-xs`
- Heart button: `h-10 w-10` becomes `h-8 w-8 sm:h-10 sm:w-10`
- Badge container: `top-4 left-4` becomes `top-2 left-2 sm:top-4 sm:left-4`

### 3b. Product Section Carousel - Narrower Cards on Mobile

**File: `src/components/ProductSection.tsx`**

Changes:
- Card width in carousel: `w-[280px]` becomes `w-[200px] sm:w-[260px]`
- Section title: `text-2xl` becomes `text-lg sm:text-2xl`
- Loading skeleton width matches card width
- Section padding: `py-8` becomes `py-5 sm:py-8`

### 3c. Home Page Grid - 2 Columns on Mobile

**File: `src/pages/Home.tsx`**

Changes:
- Products grid: `grid-cols-1 sm:grid-cols-2` becomes `grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Grid gap: `gap-6` becomes `gap-3 sm:gap-6`
- Loading skeleton grid matches
- Hero heading: `text-4xl sm:text-5xl md:text-7xl` becomes `text-3xl sm:text-5xl md:text-7xl`
- Hero subtitle: smaller text on mobile
- Search bar padding: reduce on mobile
- Trust badges: smaller text and padding on mobile
- Floating buttons: `bottom-6 right-6` becomes `bottom-4 right-4` for better mobile spacing

### 3d. Product Detail Page - Mobile Polish

**File: `src/pages/ProductDetail.tsx`**

Changes:
- Container padding: `pt-24` becomes `pt-20` (less wasted space under header)
- Image area padding: `p-4` becomes `p-2 sm:p-4`
- Review section grid: already responsive, no changes needed

### 3e. Checkout Page - Mobile Polish

**File: `src/pages/Checkout.tsx`**

Changes:
- Progress indicator: hide text labels on mobile, show only circles
- Container top padding adjustment
- Heading: `text-3xl` becomes `text-2xl sm:text-3xl`

### 3f. Header - Compact on Mobile

**File: `src/components/Header.tsx`**

Changes:
- Logo height: `h-11` becomes `h-9 sm:h-11`
- Container padding: `py-4` becomes `py-3 sm:py-4`
- Button sizes: slightly smaller touch targets that still meet 44px minimum

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/migrations/` | Add `video_url` column, create `product-videos` bucket with RLS |
| `src/types/index.ts` | Add `video_url` to Product interface |
| `src/pages/admin/Products.tsx` | Video upload UI + iterative image compression |
| `src/pages/ProductDetail.tsx` | Video player + mobile padding adjustments |
| `src/components/ProductCard.tsx` | Compact mobile layout (smaller padding, text, buttons) |
| `src/components/ProductSection.tsx` | Narrower carousel cards on mobile |
| `src/pages/Home.tsx` | 2-column mobile grid, smaller hero text, compact floating buttons |
| `src/pages/Checkout.tsx` | Compact progress indicator on mobile |
| `src/components/Header.tsx` | Smaller logo and padding on mobile |

---

## Technical Notes

### Image Compression Algorithm
The enhanced compression iteratively reduces JPEG quality from 0.9 to 0.1 in 0.1 steps. If the image still exceeds 5MB after quality reduction, it falls back to reducing max dimensions from 1200px to 800px at 0.7 quality. This guarantees all uploaded images are under 5MB.

### Video Upload Constraints
- Maximum file size: 50MB
- Accepted formats: MP4, WebM, MOV (via `accept="video/*"`)
- Uploaded to dedicated `product-videos` storage bucket
- Public read access, admin-only write access

### Mobile Card Layout Strategy
The product cards use a "compact-first" approach:
- 2-column grid on mobile (phones see 2 products side by side)
- Cards have tight 12px padding on mobile vs 20px on desktop
- Description text hidden on mobile to save vertical space
- Price text scaled down from 3xl to xl on mobile
- Buttons use default size instead of large on mobile

### AdSense Status
Everything is correctly configured. Google typically takes 1-2 days to review and approve a site for ad serving. The `ads.txt` file at `/ads.txt` and the meta tag in the head are both present and correctly reference `ca-pub-5592901106185844`.
