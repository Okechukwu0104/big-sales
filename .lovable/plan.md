

# Make Search the Hero Experience (Google-Style)

## Current State
The search bar exists in the hero section but it's buried under headings, badges, and text. Users may scroll past it. The WhatsApp fallback when no results are found also exists but only appears deep in the "all products" view.

## Changes

### 1. Redesign Hero as a Search-First Experience (`src/pages/Home.tsx`)

Transform the hero into a Google-style search-dominant layout:

- **Make the search bar the visual centerpiece** — larger, with a pulsing/glowing border animation to draw attention
- **Add placeholder text that rotates** through example searches: "Search for Air Fryer...", "Search for Blender...", "Search for Kitchen Set..." — this teaches users what to search for
- **Add instant search dropdown** — as the user types, show matching products in a floating dropdown (like Google autocomplete) with product image thumbnails, names, and prices. Clicking a result navigates directly to the product
- **Move the tagline/badges below the search** to keep focus on the input
- **Add a subtle "Type to find any product" hint** below the search bar with a keyboard icon

### 2. Instant Search Dropdown Component

When the user types in the search bar:
- Show a floating dropdown below the search input (max 5 results)
- Each result row: product thumbnail (40x40), name, price — clickable to navigate to `/product/:id`
- If no results: show the WhatsApp fallback CTA directly in the dropdown (no need to switch to "all products" view first)
- Dropdown dismisses on blur or Escape

### 3. Visual Enhancements

- Search bar gets a subtle animated gradient border (orange pulse)
- Add a "🔍 What are you looking for today?" text above the search bar instead of generic tagline
- The rotating placeholder provides social proof that the store has specific products

### File Changes

| File | Changes |
|------|---------|
| `src/pages/Home.tsx` | Redesign hero section: search-first layout, add instant search dropdown with product previews + WhatsApp fallback, rotating placeholder text, animated search bar styling |

### Technical Approach

- New state: `showSearchDropdown` (boolean), `placeholderIndex` (number for rotation)
- `useEffect` with `setInterval` to rotate placeholder text every 3 seconds
- Dropdown renders as an absolute-positioned div below the search input
- Uses existing `filteredProducts` logic, sliced to 5 for the dropdown
- `useNavigate` to handle clicking a search result
- WhatsApp fallback shown inline in dropdown when 0 results
- Click outside / blur closes the dropdown

