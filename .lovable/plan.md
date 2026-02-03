
# Home Page Enhancement Plan

## Overview

This plan adds four new features to enhance the home page user experience:
1. Promotional banner carousel for sales and special offers
2. Recently viewed products section (session-based tracking)
3. Horizontal scrolling category browser (like New Arrivals)
4. Contact Us popup for WhatsApp communication

---

## Part 1: Promotional Banner Carousel

### Database Changes

Create a new `promotional_banners` table to store banner content:

```sql
CREATE TABLE promotional_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  background_color TEXT DEFAULT '#f97316',
  text_color TEXT DEFAULT '#ffffff',
  link_url TEXT,
  link_text TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE promotional_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners"
  ON promotional_banners FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage banners"
  ON promotional_banners FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

### New Component: `src/components/PromoBannerCarousel.tsx`

A beautiful auto-playing carousel featuring:
- Full-width banner slides with gradient backgrounds
- Title, subtitle, and optional call-to-action button
- Auto-advance every 5 seconds with pause on hover
- Dot indicators for navigation
- Smooth slide transitions using Embla Carousel
- Support for custom background colors and images
- Responsive design for mobile/desktop

### File Changes

**File: `src/pages/Home.tsx`**
- Import and add `PromoBannerCarousel` component at the top of the page (above hero section)

---

## Part 2: Recently Viewed Products Section

### Implementation Approach

Use `sessionStorage` to track products viewed during the current browser session (clears when browser closes).

### New Hook: `src/hooks/useRecentlyViewed.ts`

```typescript
interface RecentlyViewedItem {
  productId: string;
  viewedAt: number;
}

// Functions:
// - addToRecentlyViewed(productId: string)
// - getRecentlyViewed(): string[]
// - clearRecentlyViewed()
```

Logic:
- Store up to 10 recently viewed product IDs
- Newest items at the front, remove duplicates
- Track timestamp for sorting

### File Changes

**File: `src/pages/ProductDetail.tsx`**
- Call `addToRecentlyViewed(id)` when product page loads

**File: `src/pages/Home.tsx`**
- Add new query to fetch products by recently viewed IDs
- Add `ProductSection` for "Recently Viewed" after other sections
- Only show if there are recently viewed products

---

## Part 3: Horizontal Scrolling Category Browser

### Changes to `src/components/CategoryBrowser.tsx`

Transform from grid layout to horizontal scroll carousel matching `ProductSection` style:

- Change from `grid` to `flex overflow-x-auto` with scroll snap
- Add left/right navigation arrows (appear on hover)
- Filter out "Uncategorized" category
- Add smooth scrolling behavior
- Keep the visual styling of category cards

Layout comparison:
```text
BEFORE (Grid):
┌────┐ ┌────┐ ┌────┐
│    │ │    │ │    │
└────┘ └────┘ └────┘
┌────┐ ┌────┐ ┌────┐
│    │ │    │ │    │
└────┘ └────┘ └────┘

AFTER (Horizontal Scroll):
← ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ →
  │    │ │    │ │    │ │    │ │    │
  └────┘ └────┘ └────┘ └────┘ └────┘
```

---

## Part 4: Contact Us Popup (WhatsApp)

### New Component: `src/components/ContactUsPopup.tsx`

A floating button + sheet/dialog that provides easy WhatsApp contact:

Features:
- Floating button in bottom-right corner (above scroll-to-top button)
- Opens a sheet/dialog with contact form
- Pre-filled message options:
  - "I have a question about a product"
  - "I need help with my order"
  - "General inquiry"
  - Custom message input
- Uses existing WhatsApp deep-link/web-link pattern from Header.tsx
- Animated entrance and hover effects

UI Layout:
```text
┌──────────────────────────────────────┐
│  💬 Contact Us                    X  │
├──────────────────────────────────────┤
│                                      │
│  How can we help you?                │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ 📦 Question about a product    │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ 🚚 Help with my order          │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ 💬 General inquiry             │  │
│  └────────────────────────────────┘  │
│                                      │
│  Or type your message:               │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │   💬 Send via WhatsApp         │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### File Changes

**File: `src/pages/Home.tsx`**
- Import and add `ContactUsPopup` component
- Position it with the other floating buttons

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/migrations/` | New migration for `promotional_banners` table |
| `src/components/PromoBannerCarousel.tsx` | **NEW** - Auto-playing promotional banner carousel |
| `src/hooks/useRecentlyViewed.ts` | **NEW** - Session-based recently viewed tracking hook |
| `src/components/CategoryBrowser.tsx` | Convert from grid to horizontal scroll with arrows |
| `src/components/ContactUsPopup.tsx` | **NEW** - Floating contact button with WhatsApp integration |
| `src/pages/Home.tsx` | Add promo carousel, recently viewed section, contact popup |
| `src/pages/ProductDetail.tsx` | Track product views with useRecentlyViewed hook |
| `src/types/index.ts` | Add PromotionalBanner interface |

---

## Technical Notes

### Session Storage for Recently Viewed
- Uses `sessionStorage` (not `localStorage`) so data clears when browser closes
- Maximum 10 products stored to prevent memory bloat
- Products are de-duplicated (viewing same product moves it to front)

### Banner Carousel Auto-Play
- 5-second interval between slides
- Pauses on hover for better UX
- Resumes when mouse leaves
- Uses Embla Carousel (already installed) for smooth transitions

### WhatsApp Integration
- Reuses the existing deep-link/web-link fallback pattern from Header.tsx
- Uses `whatsapp://send` for mobile app deep-link
- Falls back to `api.whatsapp.com` for web browsers
- Includes pre-formatted messages for common inquiries

### Category Filtering
- Excludes categories with name "Uncategorized" (case-insensitive)
- Maintains existing category click behavior (navigates to filtered view)
