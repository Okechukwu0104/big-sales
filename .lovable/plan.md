

# Fix Offline Banner Alignment & Offline Product Upload Strategy

## Part 1: Fix Offline Banner Alignment

The current offline banner uses the `Alert` component with `[&>svg~*]:pl-7` and absolute-positioned icon which causes misalignment. The fix is to use flexbox for proper centering.

### File: `src/App.tsx` (lines 65-74)

Replace the current banner with a properly aligned flexbox layout:
- Use a `flex items-center justify-center gap-2` container inside the fixed div
- Use `py-2 px-4` for compact spacing
- Add a destructive background color directly instead of relying on the Alert component's absolute positioning
- Keep the `WifiOff` icon inline with the text
- Add `text-sm font-medium` for readability

The new markup:
```
<div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground">
  <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium">
    <WifiOff className="h-4 w-4 shrink-0" />
    <span>You're offline. Some features may be unavailable.</span>
  </div>
</div>
```

This removes the `Alert` component dependency and gives clean, centered alignment.

---

## Part 2: Offline Product Upload - Recommendation

True offline uploads for admin are technically possible but complex. Here are the options:

### Option A: Local Queue with Auto-Sync (Recommended - Practical)
- When offline, save product data (name, price, description, category) to `localStorage` as a queue
- Show a "Pending Uploads" indicator in the admin panel
- When the browser comes back online (`navigator.onLine`), automatically process the queue one by one
- **Limitation**: Images/videos cannot be stored in localStorage (too large). Only text fields are queued. Media must be uploaded when back online.
- Implementation: ~moderate complexity

### Option B: IndexedDB with Full Media Caching
- Use IndexedDB to store product data AND binary image/video files offline
- Full offline capability including media
- Much more complex, requires a service worker for background sync
- Implementation: high complexity

### Recommended approach: Option A
- Store product text data (name, price, description, etc.) in localStorage when offline
- Show a toast: "Product saved locally. Will upload when you're back online."
- Add an `useEffect` that listens for `online` event and processes the queue
- Display a "Pending uploads (X)" badge in the admin sidebar
- For images: show a placeholder and prompt admin to add image when back online
- Skip video uploads entirely when offline (too large for local storage)

### Implementation Details

**File: `src/pages/admin/Products.tsx`**

Changes:
- Add `isOnline` state using `navigator.onLine` + event listeners
- Add `pendingProducts` state from localStorage
- In the create mutation's `onMutate`: if offline, save to localStorage queue and show info toast, then return early
- Add `useEffect` on `online` event: process localStorage queue by calling the create mutation for each item
- Show "X pending uploads" banner at top of products page when queue is not empty
- Disable image/video file inputs when offline with helper text "Available when online"

**New utility: `src/utils/offlineQueue.ts`**
- `addToQueue(product)` - saves product data to localStorage
- `getQueue()` - retrieves pending products
- `removeFromQueue(id)` - removes after successful upload
- `getQueueCount()` - returns count for badge display

---

## Summary

| File | Changes |
|------|---------|
| `src/App.tsx` | Fix offline banner alignment with flexbox |
| `src/pages/admin/Products.tsx` | Add offline queue logic, pending uploads indicator, disable media inputs when offline |
| `src/utils/offlineQueue.ts` | New utility for localStorage-based offline queue management |

