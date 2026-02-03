import { useCallback, useMemo, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'recently-viewed-products';
const MAX_ITEMS = 10;

interface RecentlyViewedItem {
  productId: string;
  viewedAt: number;
}

// Get items from sessionStorage
const getStoredItems = (): RecentlyViewedItem[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

// Save items to sessionStorage
const saveItems = (items: RecentlyViewedItem[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    // Dispatch custom event to notify subscribers
    window.dispatchEvent(new CustomEvent('recently-viewed-update'));
  } catch {
    // Ignore storage errors
  }
};

// Subscribe to changes (for useSyncExternalStore)
const subscribe = (callback: () => void): (() => void) => {
  window.addEventListener('recently-viewed-update', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('recently-viewed-update', callback);
    window.removeEventListener('storage', callback);
  };
};

// Get snapshot for useSyncExternalStore
const getSnapshot = (): string => {
  const items = getStoredItems();
  return JSON.stringify(items.map(item => item.productId));
};

// Server snapshot
const getServerSnapshot = (): string => {
  return JSON.stringify([]);
};

export const useRecentlyViewed = () => {
  // Subscribe to storage changes for reactivity
  const productIdsJson = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const recentlyViewedIds = useMemo(() => {
    try {
      return JSON.parse(productIdsJson) as string[];
    } catch {
      return [];
    }
  }, [productIdsJson]);

  const addToRecentlyViewed = useCallback((productId: string): void => {
    const items = getStoredItems();
    
    // Remove existing entry for this product (to move it to front)
    const filteredItems = items.filter(item => item.productId !== productId);
    
    // Add new entry at the front
    const newItems: RecentlyViewedItem[] = [
      { productId, viewedAt: Date.now() },
      ...filteredItems,
    ].slice(0, MAX_ITEMS);
    
    saveItems(newItems);
  }, []);

  const clearRecentlyViewed = useCallback((): void => {
    saveItems([]);
  }, []);

  const removeFromRecentlyViewed = useCallback((productId: string): void => {
    const items = getStoredItems();
    const filteredItems = items.filter(item => item.productId !== productId);
    saveItems(filteredItems);
  }, []);

  return {
    recentlyViewedIds,
    addToRecentlyViewed,
    clearRecentlyViewed,
    removeFromRecentlyViewed,
  };
};
