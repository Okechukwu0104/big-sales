const DB_NAME = 'offline_product_queue';
const DB_VERSION = 1;
const STORE_NAME = 'products';

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
  imageFile?: ArrayBuffer | null;
  imageName?: string | null;
  imageType?: string | null;
  videoFile?: ArrayBuffer | null;
  videoName?: string | null;
  videoType?: string | null;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const addToQueue = async (
  product: Omit<OfflineProduct, 'id' | 'createdAt'>,
  imageFile?: File | null,
  videoFile?: File | null,
): Promise<OfflineProduct> => {
  const entry: OfflineProduct = {
    ...product,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    imageFile: imageFile ? await imageFile.arrayBuffer() : null,
    imageName: imageFile?.name ?? null,
    imageType: imageFile?.type ?? null,
    videoFile: videoFile ? await videoFile.arrayBuffer() : null,
    videoName: videoFile?.name ?? null,
    videoType: videoFile?.type ?? null,
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
};

export const getQueue = async (): Promise<OfflineProduct[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
};

export const removeFromQueue = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getQueueCount = async (): Promise<number> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
};

export const clearQueue = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
