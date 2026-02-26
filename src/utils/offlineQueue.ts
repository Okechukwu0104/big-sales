const QUEUE_KEY = 'offline_product_queue';

export interface OfflineProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  featured: boolean;
  collection_id: string | null;
  selectedCategories: string[];
  createdAt: string;
}

export const addToQueue = (product: Omit<OfflineProduct, 'id' | 'createdAt'>): OfflineProduct => {
  const queue = getQueue();
  const entry: OfflineProduct = {
    ...product,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
  queue.push(entry);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return entry;
};

export const getQueue = (): OfflineProduct[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const removeFromQueue = (id: string): void => {
  const queue = getQueue().filter(p => p.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getQueueCount = (): number => getQueue().length;

export const clearQueue = (): void => {
  localStorage.removeItem(QUEUE_KEY);
};
