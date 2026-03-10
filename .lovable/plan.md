

# Fix Search Dropdown, Stats & Trust Badges

## Issues Found

1. **Search dropdown positioning** — The `InstantSearchDropdown` has `absolute top-full` in its own component AND is wrapped in another `absolute` div in Home.tsx, causing double-positioning. The dropdown renders behind/misaligned with the trust badges below (z-index conflict with `z-10` on badges vs `z-50` on dropdown).

2. **SocialProofStats & HowItWorks removed** — The last diff shows these were removed from Home.tsx. They need to be re-added with corrected data.

3. **Incorrect stats** — Cities should be 5 (not 36), and the customer/order counts should pull from real data (Supabase). For now, we'll query actual counts from the database.

4. **"Pay on Delivery" needs replacing** — Both in the hero trust badges and TrustBadges section.

## Plan

### 1. Fix Search Dropdown (`src/pages/Home.tsx` + `src/components/InstantSearchDropdown.tsx`)
- Remove the extra `absolute` wrapper div in Home.tsx (lines 369-377) — the dropdown component already positions itself absolutely
- The dropdown component already has `absolute top-full z-50` — that's sufficient
- This fixes the double-positioning issue visible in the screenshot

### 2. Fix Stats (`src/components/SocialProofStats.tsx`)
- Change cities from 36 to **5**
- Query Supabase for real counts: total unique customers (from `orders` table), total delivered orders, and average review rating
- Fall back to animated counters with real data instead of hardcoded numbers

### 3. Re-add SocialProofStats & HowItWorks to Home.tsx
- Import and place them back between the product sections and TrustBadges

### 4. Replace "Pay on Delivery" (`src/pages/Home.tsx` + `src/components/TrustBadges.tsx`)
- Hero badge: Replace "Pay on Delivery" with **"Best Prices Guaranteed"**
- TrustBadges section: Replace the "Pay on Delivery" badge with **"Unbeatable Prices"** — "We offer the best deals you won't find anywhere else"

### File Changes

| File | Changes |
|------|---------|
| `src/pages/Home.tsx` | Remove double-absolute wrapper on dropdown; re-add SocialProofStats + HowItWorks imports; replace "Pay on Delivery" hero badge |
| `src/components/InstantSearchDropdown.tsx` | No changes needed (positioning is correct) |
| `src/components/SocialProofStats.tsx` | Query real customer/order/rating counts from Supabase; change cities to 5 |
| `src/components/TrustBadges.tsx` | Replace "Pay on Delivery" with "Unbeatable Prices" |

