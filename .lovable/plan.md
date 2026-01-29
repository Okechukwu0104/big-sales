

# Home Page Redesign Plan

## Overview

Transform the home page into a beautiful, professional e-commerce experience with curated product sections, intelligent search, and a WhatsApp fallback for products not found.

---

## New Home Page Structure

### Visual Layout

```text
┌──────────────────────────────────────────────────────────┐
│                      HEADER                               │
├──────────────────────────────────────────────────────────┤
│                                                           │
│   ┌─────────────────────────────────────────────────┐    │
│   │              HERO SECTION                        │    │
│   │   "Discover Amazing Products"                    │    │
│   │   [    🔍 Search products...           ]        │    │
│   │   Premium Quality • Fast Shipping • Best Prices │    │
│   └─────────────────────────────────────────────────┘    │
│                                                           │
│   ═══════════════════════════════════════════════════    │
│                                                           │
│   🆕 NEW ARRIVALS              [See All Products →]      │
│   ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                     │
│   │    │ │    │ │    │ │    │ │    │  ← Horizontal scroll│
│   └────┘ └────┘ └────┘ └────┘ └────┘                     │
│                                                           │
│   ═══════════════════════════════════════════════════    │
│                                                           │
│   🔥 BEST SELLERS              [See All Products →]      │
│   ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                     │
│   │    │ │    │ │    │ │    │ │    │  ← Horizontal scroll│
│   └────┘ └────┘ └────┘ └────┘ └────┘                     │
│                                                           │
│   ═══════════════════════════════════════════════════    │
│                                                           │
│   ⭐ FEATURED PRODUCTS         [See All Products →]      │
│   ┌────┐ ┌────┐ ┌────┐ ┌────┐                            │
│   │    │ │    │ │    │ │    │                            │
│   └────┘ └────┘ └────┘ └────┘                            │
│                                                           │
│   ═══════════════════════════════════════════════════    │
│                                                           │
│   📦 BROWSE BY CATEGORY                                  │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│   │      │ │      │ │      │ │      │                    │
│   └──────┘ └──────┘ └──────┘ └──────┘                    │
│                                                           │
│   ═══════════════════════════════════════════════════    │
│                                                           │
│   ✅ Trust Badges | ⭐ Testimonials | ❓ FAQ              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Part 1: Create New Data Queries

**File: `src/pages/Home.tsx`**

Add new queries for:

1. **Most Recent Products** (New Arrivals)
   - Query products ordered by `created_at DESC`
   - Limit to 8 products
   
2. **Most Purchased Products** (Best Sellers)
   - Parse `order_items` JSONB from orders table
   - Count product occurrences across all orders
   - Join with products table to get full details
   - This requires a database function or client-side calculation

3. **Featured Products**
   - Query products where `featured = true`
   - Already exists in current implementation

**Database Query for Best Sellers:**
Since order_items is JSONB, calculate best sellers client-side by:
```typescript
// Fetch all orders
const { data: orders } = await supabase.from('orders').select('order_items');

// Count product purchases
const purchaseCounts = {};
orders.forEach(order => {
  order.order_items.forEach(item => {
    purchaseCounts[item.id] = (purchaseCounts[item.id] || 0) + item.quantity;
  });
});

// Sort and get top products
const topProductIds = Object.entries(purchaseCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8)
  .map(([id]) => id);
```

---

### Part 2: Search with "Product Not Found" WhatsApp Flow

**File: `src/pages/Home.tsx`**

When search returns no results:
- Show a friendly "Product not found" message
- Add a "Can't find what you're looking for?" button
- Clicking sends a WhatsApp message with the search query

**WhatsApp Message Template:**
```
"Hi! I'm looking for: [search term]
Could you help me find this product?"
```

**Implementation Pattern** (using existing Header.tsx pattern):
```typescript
const requestProductViaWhatsApp = () => {
  if (!storeConfig?.whatsapp_number) {
    toast({
      title: "WhatsApp not configured",
      description: "Please contact the store owner directly.",
      variant: "destructive"
    });
    return;
  }

  const message = `Hi! I'm looking for: ${searchTerm}%0ACould you help me find this product?`;
  const deepLink = `whatsapp://send?phone=${phoneNumber}&text=${message}`;
  const webLink = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;
  
  // Use existing fallback pattern from Header.tsx
};
```

---

### Part 3: Product Section Components

**New File: `src/components/ProductSection.tsx`**

A reusable horizontal scrolling product section:

```typescript
interface ProductSectionProps {
  title: string;
  icon: React.ReactNode;
  products: Product[];
  showSeeAll?: boolean;
  onSeeAll?: () => void;
}
```

Features:
- Horizontal scroll with smooth snap
- Left/Right navigation arrows
- "See All Products" button
- Animated entrance on scroll

---

### Part 4: Category Browser Component

**New File: `src/components/CategoryBrowser.tsx`**

Display product categories as clickable cards:
- Fetch categories from `categories` table
- Show category image/icon and name
- Clicking filters products to that category

---

### Part 5: All Products Page/View

**File: `src/pages/Home.tsx`**

Add state for viewing all products:
```typescript
const [viewMode, setViewMode] = useState<'home' | 'all'>('home');
```

When "See All Products" is clicked:
- Switch to full grid view
- Show all products with search/filter
- Add "Back to Home" button

---

### Part 6: UI/UX Enhancements

**Visual Design Elements:**

1. **Hero Section**
   - Large prominent search bar
   - Animated floating badges
   - Gradient background with subtle pattern

2. **Section Headers**
   - Icon + Title + "See All" button aligned
   - Subtle divider lines between sections
   
3. **Product Cards**
   - Consistent sizing in horizontal scroll
   - Hover animations (already implemented)
   - Sale badges, stock indicators (already implemented)

4. **Empty States**
   - Friendly illustrations
   - Clear call-to-action buttons
   - WhatsApp fallback prominently displayed

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | Complete redesign with new sections, queries, and WhatsApp search fallback |
| `src/components/ProductSection.tsx` | **NEW** - Reusable horizontal product carousel |
| `src/components/CategoryBrowser.tsx` | **NEW** - Category grid component |

---

## Expected User Experience

1. **Landing** → User sees hero with search, then curated sections
2. **Discovery** → Scroll through New Arrivals, Best Sellers, Featured
3. **Search** → Type in search bar, results filter in real-time
4. **Not Found** → If no results, prompt to request via WhatsApp
5. **Browse All** → Click "See All Products" to view full catalog
6. **Category Filter** → Click category cards to filter by category

---

## Performance Considerations

- Products fetch once on page load
- Best sellers calculated client-side from orders (cached via React Query)
- Lazy loading for off-screen product images (already implemented)
- Smooth horizontal scroll with CSS scroll-snap

