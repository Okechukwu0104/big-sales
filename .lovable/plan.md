

# Low-Network Optimization, Google AdSense & Build Fix

## Overview

Three changes: fix the existing build error, optimize the app for slow networks, and integrate Google AdSense.

---

## Part 1: Fix Build Error

**File: `supabase/functions/categorize-product/index.ts`** (line 87)

Add a type guard before accessing `.name` on the caught `unknown` error:

```typescript
} catch (fetchError) {
  clearTimeout(timeoutId);
  if (fetchError instanceof Error && fetchError.name === 'AbortError') {
```

---

## Part 2: Google AdSense Integration

**File: `index.html`**

Add the AdSense script inside the `<head>` tag:

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5592901106185844"
     crossorigin="anonymous"></script>
```

Since this is a Single Page Application (SPA), there is only one `index.html` that serves all pages -- so placing it once in the head is sufficient for every route.

---

## Part 3: Low/Slow Network Optimizations

### 3a. React Query Caching & Offline Resilience

**File: `src/App.tsx`**

Configure the QueryClient with aggressive caching and retry settings:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min before refetch
      gcTime: 30 * 60 * 1000,         // Keep cache 30 min
      retry: 3,                        // Retry failed requests 3 times
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: false,     // Don't refetch on tab switch
      networkMode: 'offlineFirst',     // Use cache when offline
    },
  },
});
```

### 3b. Lazy Loading Routes

**File: `src/App.tsx`**

Use `React.lazy` and `Suspense` for admin pages and less-visited pages so the initial bundle is smaller:

```typescript
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
// ... etc for all admin routes
```

Wrap routes in a `<Suspense>` with a lightweight loading spinner.

### 3c. Image Loading Optimization

**File: `src/components/ProductCard.tsx`**

Add `loading="lazy"` to product images (if not already present) so images only load when scrolled into view.

### 3d. Offline Detection Banner

**File: `src/App.tsx`** or **`src/components/Header.tsx`**

Add a small banner that appears when the user goes offline:

```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);
useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

Display a subtle toast/banner: "You're offline. Some features may be unavailable."

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/categorize-product/index.ts` | Fix `fetchError` type guard (build error) |
| `index.html` | Add Google AdSense script in head |
| `src/App.tsx` | QueryClient caching config, lazy-loaded routes, Suspense fallback |
| `src/components/ProductCard.tsx` | Ensure `loading="lazy"` on images |
| `src/components/Header.tsx` | Offline detection banner |

