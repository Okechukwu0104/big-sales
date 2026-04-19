import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Sparkles, GripVertical, Filter, FolderOpen, Layers, Loader2, WifiOff, Video, CloudUpload, Clock, Upload, X, ImagePlus } from 'lucide-react';
import { addToQueue, getQueue, removeFromQueue, getQueueCount, OfflineProduct } from '@/utils/offlineQueue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Product, Category, Collection } from '@/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 800;
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000;
const MAX_BULK_FILES = 10;
const BULK_UPLOAD_LIMIT = 2;
const BULK_UPLOAD_STORAGE_KEY = 'bulk_upload_usage';

// Utility: Iterative image compression
const compressImage = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = (height / width) * MAX_IMAGE_DIMENSION;
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = (width / height) * MAX_IMAGE_DIMENSION;
          height = MAX_IMAGE_DIMENSION;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      const tryCompress = (quality: number): void => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Failed to compress image')); return; }
            if (blob.size <= MAX_IMAGE_SIZE || quality <= 0.1) {
              if (blob.size > MAX_IMAGE_SIZE && width > 800) {
                const ratio = 800 / Math.max(width, height);
                canvas.width = width * ratio;
                canvas.height = height * ratio;
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                  (smallBlob) => { if (smallBlob) resolve(smallBlob); else resolve(blob); },
                  'image/jpeg', 0.7
                );
              } else { resolve(blob); }
            } else { tryCompress(Math.round((quality - 0.1) * 10) / 10); }
          },
          'image/jpeg', quality
        );
      };
      tryCompress(0.9);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Extract video thumbnail
const extractVideoThumbnail = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(video.videoWidth, 800);
      canvas.height = Math.min(video.videoHeight, 800);
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('Failed to extract thumbnail'));
        },
        'image/jpeg', 0.8
      );
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load video')); };
  });
};

// Convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Utility: Retry with exponential backoff
const retryWithBackoff = async <T,>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
};

// Rate limiting utility for bulk upload
const checkBulkUploadLimit = (): { allowed: boolean; remaining: number; resetTime: string } => {
  const today = new Date().toDateString();
  const stored = localStorage.getItem(BULK_UPLOAD_STORAGE_KEY);
  
  let usage = { date: today, count: 0 };
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) {
        usage = parsed;
      }
    } catch (e) {
      console.error('Failed to parse bulk upload usage', e);
    }
  }
  
  const remaining = Math.max(0, BULK_UPLOAD_LIMIT - usage.count);
  const resetTime = new Date(new Date().setHours(23, 59, 59, 999)).toLocaleTimeString();
  
  return { 
    allowed: usage.count < BULK_UPLOAD_LIMIT, 
    remaining,
    resetTime
  };
};

const incrementBulkUploadCount = () => {
  const today = new Date().toDateString();
  const stored = localStorage.getItem(BULK_UPLOAD_STORAGE_KEY);
  
  let usage = { date: today, count: 0 };
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.date === today) {
        usage = parsed;
      }
    } catch (e) {}
  }
  
  usage.count += 1;
  localStorage.setItem(BULK_UPLOAD_STORAGE_KEY, JSON.stringify(usage));
  return usage.count;
};

// Bulk upload item interface
interface BulkItem {
  id: string;
  file: File;
  thumbnailUrl: string;
  isVideo: boolean;
  status: 'pending' | 'analyzing' | 'ready' | 'error' | 'creating' | 'done';
  name: string;
  description: string;
  price: string;
  category: string;
  error?: string;
}

interface SortableProductProps {
  product: Product;
  categories: Category[];
  productCategories: Record<string, string[]>;
  collections: Collection[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

const SortableProduct = ({ product, categories, productCategories, collections, onEdit, onDelete }: SortableProductProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const productCategoryNames = (productCategories[product.id] || [])
    .map(catId => categories.find(c => c.id === catId)?.name)
    .filter(Boolean);
  const collection = collections.find(c => c.id === product.collection_id);

  const hasDiscount = product.original_price != null && product.discount_price != null;
  const discountPercent = hasDiscount ? Math.round((1 - product.discount_price! / product.original_price!) * 100) : 0;

  return (
    <Card ref={setNodeRef} style={style} className="mb-2">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none flex-shrink-0 mt-1 sm:mt-0">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          {product.image_url && (
            <img src={product.image_url} alt={product.name} loading="lazy" width={64} height={64} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate">{product.name}</h3>
            <p className="text-muted-foreground text-xs sm:text-sm line-clamp-1">{product.description}</p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {hasDiscount ? (
                <>
                  <span className="line-through text-muted-foreground text-xs">₦{product.original_price}</span>
                  <span className="font-bold text-primary text-sm">₦{product.discount_price}</span>
                  <Badge variant="destructive" className="text-[10px]">{discountPercent}% OFF</Badge>
                </>
              ) : (
                <p className="font-bold text-primary text-sm">₦{product.price}</p>
              )}
              <span className={`text-xs px-2 py-0.5 rounded ${product.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {product.in_stock ? `${product.quantity} in stock` : 'Out of stock'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {productCategoryNames.map((name, i) => (
                <Badge key={i} variant="secondary" className="text-xs"><FolderOpen className="h-3 w-3 mr-1" />{name}</Badge>
              ))}
              {collection && <Badge variant="outline" className="text-xs"><Layers className="h-3 w-3 mr-1" />{collection.name}</Badge>}
              {product.featured && <Badge className="text-xs">Featured</Badge>}
              {product.video_url && <Badge variant="outline" className="text-xs"><Video className="h-3 w-3 mr-1" />Video</Badge>}
            </div>
          </div>
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => onEdit(product)} className="h-8 w-8 p-0 sm:h-9 sm:w-9"><Edit className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(product.id)} className="h-8 w-8 p-0 sm:h-9 sm:w-9"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterCollection, setFilterCollection] = useState<string>('all');
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [progressValue, setProgressValue] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [isFixingDescriptions, setIsFixingDescriptions] = useState(false);
  // Bulk upload state
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  const bulkFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { getQueueCount().then(setPendingCount); }, []);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    original_price: '',
    discount_price: '',
    quantity: '',
    featured: false,
    image: null as File | null,
    video: null as File | null,
    collection_id: '',
    selectedCategories: [] as string[],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // Auto-sync offline queue
  const syncOfflineQueue = useCallback(async () => {
    if (isSyncing) return;
    const queue = await getQueue();
    if (queue.length === 0) return;
    setIsSyncing(true);
    let synced = 0;
    for (const item of queue) {
      try {
        let image_url: string | null = null;
        let video_url: string | null = null;
        if (item.imageFile && item.imageName) {
          const blob = new Blob([item.imageFile], { type: item.imageType || 'image/jpeg' });
          const fileName = `${Math.random()}.${item.imageName.split('.').pop() || 'jpg'}`;
          const { error: imgErr } = await supabase.storage.from('product-images').upload(fileName, blob);
          if (!imgErr) image_url = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
        }
        if (item.videoFile && item.videoName) {
          const blob = new Blob([item.videoFile], { type: item.videoType || 'video/mp4' });
          const fileName = `${Math.random()}.${item.videoName.split('.').pop() || 'mp4'}`;
          const { error: vidErr } = await supabase.storage.from('product-videos').upload(fileName, blob);
          if (!vidErr) video_url = supabase.storage.from('product-videos').getPublicUrl(fileName).data.publicUrl;
        }
        const { data: newProduct, error } = await supabase.from('products').insert([{
          name: item.name, description: item.description, price: item.price,
          quantity: item.quantity, featured: item.featured, collection_id: item.collection_id,
          original_price: item.original_price ?? null,
          discount_price: item.discount_price ?? null,
          image_url, video_url, category: 'Uncategorized', display_order: 999,
        }]).select().single();
        if (error) throw error;
        if (item.selectedCategories.length > 0) {
          await supabase.from('product_categories').insert(item.selectedCategories.map(catId => ({ product_id: newProduct.id, category_id: catId })));
        }
        supabase.auth.getSession().then(({ data: sessionData }) => {
          const token = sessionData?.session?.access_token;
          if (!token) return;
          supabase.functions.invoke('categorize-product', {
            body: { productName: item.name, productDescription: item.description },
            headers: { Authorization: `Bearer ${token}` },
          })
            .then(({ data: categoryData }) => {
              if (categoryData?.category && categoryData.category !== 'Uncategorized') {
                supabase.from('products').update({ category: categoryData.category }).eq('id', newProduct.id);
              }
            }).catch(() => {});
        });
        await removeFromQueue(item.id);
        synced++;
      } catch (err) {
        console.error('Failed to sync offline product:', item.name, err);
        break;
      }
    }
    const remaining = await getQueueCount();
    setPendingCount(remaining);
    setIsSyncing(false);
    if (synced > 0) {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: `${synced} offline product${synced > 1 ? 's' : ''} synced!`, description: remaining > 0 ? `${remaining} still pending.` : 'All caught up.' });
    }
  }, [isSyncing, queryClient, toast]);

  useEffect(() => { if (isOnline) syncOfflineQueue(); }, [isOnline, syncOfflineQueue]);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('display_order', { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('display_order', { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: collections } = useQuery({
    queryKey: ['admin-collections'],
    queryFn: async () => {
      const { data, error } = await supabase.from('collections').select('*').order('display_order', { ascending: true });
      if (error) throw error;
      return data as Collection[];
    },
  });

  const { data: productCategories } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_categories').select('*');
      if (error) throw error;
      const map: Record<string, string[]> = {};
      data.forEach(pc => { if (!map[pc.product_id]) map[pc.product_id] = []; map[pc.product_id].push(pc.category_id); });
      return map;
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (productData: {
      name: string; description: string | null; price: number; quantity: number;
      featured: boolean; collection_id: string | null;
      original_price?: number | null; discount_price?: number | null;
    }) => {
      if (!navigator.onLine) throw new Error('You appear to be offline.');
      let image_url = null;
      if (formData.image) {
        if (formData.image.size > MAX_IMAGE_SIZE) throw new Error('Image is too large.');
        setUploadProgress('Compressing image...'); setProgressValue(10);
        const compressedBlob = await compressImage(formData.image);
        const compressedFile = new File([compressedBlob], formData.image.name, { type: 'image/jpeg' });
        setUploadProgress('Uploading image...'); setProgressValue(30);
        const fileName = `${Math.random()}.jpg`;
        await retryWithBackoff(async () => { const { error } = await supabase.storage.from('product-images').upload(fileName, compressedFile); if (error) throw error; });
        setProgressValue(60);
        image_url = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
      }
      let video_url = null;
      if (formData.video) {
        setUploadProgress('Uploading video...'); setProgressValue(50);
        const videoFileName = `${Math.random()}.${formData.video.name.split('.').pop() || 'mp4'}`;
        await retryWithBackoff(async () => { const { error } = await supabase.storage.from('product-videos').upload(videoFileName, formData.video!); if (error) throw error; });
        video_url = supabase.storage.from('product-videos').getPublicUrl(videoFileName).data.publicUrl;
      }
      setUploadProgress('Saving product...'); setProgressValue(70);

      const { data: newProduct, error } = await retryWithBackoff(async () => {
        const result = await supabase.from('products').insert([{
          name: productData.name,
          description: productData.description,
          price: productData.price,
          quantity: productData.quantity,
          featured: productData.featured,
          collection_id: productData.collection_id,
          original_price: productData.original_price ?? null,
          discount_price: productData.discount_price ?? null,
          image_url, video_url,
          category: 'Uncategorized' as string,
          display_order: (products?.length || 0) + 1,
        }]).select().single();
        if (result.error) throw result.error;
        return result;
      });
      setProgressValue(85);
      if (formData.selectedCategories.length > 0) {
        await retryWithBackoff(async () => {
          const { error } = await supabase.from('product_categories').insert(formData.selectedCategories.map(catId => ({ product_id: newProduct.id, category_id: catId })));
          if (error) throw error;
        });
      }
      setUploadProgress('Product saved! AI categorizing in background...'); setProgressValue(100);
      supabase.functions.invoke('categorize-product', { body: { productName: productData.name, productDescription: productData.description } })
        .then(({ data: categoryData }) => {
          if (categoryData?.category && categoryData.category !== 'Uncategorized') {
            supabase.from('products').update({ category: categoryData.category }).eq('id', newProduct.id).then(() => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); });
          }
        }).catch(() => {});
      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: "Product created successfully" });
      resetForm(); setIsDialogOpen(false); setUploadProgress(''); setProgressValue(0);
    },
    onError: (error) => {
      toast({ title: "Error creating product", description: error.message, variant: "destructive" });
      setUploadProgress(''); setProgressValue(0);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (productData: {
      name: string; description: string | null; price: number; quantity: number;
      featured: boolean; collection_id: string | null;
      original_price?: number | null; discount_price?: number | null;
    }) => {
      if (!navigator.onLine) throw new Error('You appear to be offline.');
      let image_url: string | undefined = undefined;
      let video_url: string | undefined = undefined;
      if (formData.image) {
        if (formData.image.size > MAX_IMAGE_SIZE) throw new Error('Image is too large.');
        setUploadProgress('Compressing image...'); setProgressValue(10);
        const compressedBlob = await compressImage(formData.image);
        const compressedFile = new File([compressedBlob], formData.image.name, { type: 'image/jpeg' });
        setUploadProgress('Uploading image...'); setProgressValue(40);
        const fileName = `${Math.random()}.jpg`;
        await retryWithBackoff(async () => { const { error } = await supabase.storage.from('product-images').upload(fileName, compressedFile); if (error) throw error; });
        image_url = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
      }
      if (formData.video) {
        setUploadProgress('Uploading video...'); setProgressValue(55);
        const videoFileName = `${Math.random()}.${formData.video.name.split('.').pop() || 'mp4'}`;
        await retryWithBackoff(async () => { const { error } = await supabase.storage.from('product-videos').upload(videoFileName, formData.video!); if (error) throw error; });
        video_url = supabase.storage.from('product-videos').getPublicUrl(videoFileName).data.publicUrl;
      }
      setUploadProgress('Updating product...'); setProgressValue(70);
      const { data, error } = await retryWithBackoff(async () => {
        const result = await supabase.from('products').update({
          ...productData,
          ...(image_url ? { image_url } : {}),
          ...(video_url ? { video_url } : {}),
        }).eq('id', editingProduct!.id).select().single();
        if (result.error) throw result.error;
        return result;
      });
      setProgressValue(85);
      await supabase.from('product_categories').delete().eq('product_id', editingProduct!.id);
      if (formData.selectedCategories.length > 0) {
        await retryWithBackoff(async () => {
          const { error } = await supabase.from('product_categories').insert(formData.selectedCategories.map(catId => ({ product_id: editingProduct!.id, category_id: catId })));
          if (error) throw error;
        });
      }
      setProgressValue(100);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: "Product updated successfully" });
      resetForm(); setIsDialogOpen(false); setUploadProgress(''); setProgressValue(0);
    },
    onError: (error) => {
      toast({ title: "Error updating product", description: error.message, variant: "destructive" });
      setUploadProgress(''); setProgressValue(0);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      queryClient.setQueryData(['admin-products'], (old: Product[] | undefined) => old?.filter(p => p.id !== productId));
      await retryWithBackoff(async () => {
        await supabase.from('product_categories').delete().eq('product_id', productId);
        const { error } = await supabase.from('products').delete().eq('id', productId);
        if (error) throw error;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: "Product deleted successfully" });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: "Error deleting product", description: error.message, variant: "destructive" });
    },
  });

  const batchCategorizeMutation = useMutation({
    mutationFn: async () => { const { data, error } = await supabase.functions.invoke('batch-categorize'); if (error) throw error; return data; },
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); toast({ title: "Batch categorization complete", description: data?.message || "Products have been categorized" }); },
    onError: (error) => { toast({ title: "Error categorizing products", description: error.message, variant: "destructive" }); },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => supabase.from('products').update({ display_order: index }).eq('id', id));
      await Promise.all(updates);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', original_price: '', discount_price: '', quantity: '', featured: false, image: null, video: null, collection_id: '', selectedCategories: [] });
    setEditingProduct(null);
    setDiscountEnabled(false);
    setUploadProgress(''); setProgressValue(0);
  };

  const openCreateDialog = () => { resetForm(); setIsDialogOpen(true); };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    const hasDiscount = product.original_price != null && product.discount_price != null;
    setDiscountEnabled(hasDiscount);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      original_price: product.original_price?.toString() || '',
      discount_price: product.discount_price?.toString() || '',
      quantity: product.quantity?.toString() || '0',
      featured: product.featured,
      image: null, video: null,
      collection_id: product.collection_id || '',
      selectedCategories: productCategories?.[product.id] || [],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(formData.price);
    let original_price: number | null = null;
    let discount_price: number | null = null;

    if (discountEnabled) {
      original_price = parseFloat(formData.original_price) || null;
      discount_price = parseFloat(formData.discount_price) || null;
      if (original_price && discount_price && discount_price >= original_price) {
        toast({ title: "Invalid discount", description: "Discount price must be less than original price.", variant: "destructive" });
        return;
      }
    }

    const finalPrice = discountEnabled && discount_price ? discount_price : price;

    const productData = {
      name: formData.name,
      description: formData.description || null,
      price: finalPrice,
      quantity: parseInt(formData.quantity) || 0,
      featured: formData.featured,
      collection_id: formData.collection_id || null,
      original_price: discountEnabled ? original_price : null,
      discount_price: discountEnabled ? discount_price : null,
    };

    if (!isOnline && !editingProduct) {
      addToQueue(
        { ...productData, selectedCategories: formData.selectedCategories },
        formData.image, formData.video,
      ).then(() => getQueueCount()).then(setPendingCount);
      toast({ title: "Product saved locally", description: "It will auto-upload when you're back online." });
      resetForm(); setIsDialogOpen(false);
      return;
    }
    if (!isOnline && editingProduct) {
      toast({ title: "You're offline", description: "Editing requires an internet connection.", variant: "destructive" });
      return;
    }
    if (editingProduct) updateProductMutation.mutate(productData);
    else createProductMutation.mutate(productData);
  };

  // ===== BULK UPLOAD LOGIC =====
  const handleBulkFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_BULK_FILES);
    if (files.length === 0) return;

    const items: BulkItem[] = [];
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      let thumbnailUrl = '';
      if (isVideo) {
        try {
          const thumb = await extractVideoThumbnail(file);
          thumbnailUrl = URL.createObjectURL(thumb);
        } catch { thumbnailUrl = ''; }
      } else {
        thumbnailUrl = URL.createObjectURL(file);
      }
      items.push({
        id: crypto.randomUUID(),
        file, thumbnailUrl, isVideo,
        status: 'pending',
        name: '', description: '', price: '', category: '',
      });
    }
    setBulkItems(items);

    // Start AI analysis sequentially
    if (isOnline) {
      setBulkProcessing(true);
      for (let i = 0; i < items.length; i++) {
        setBulkProgress(`Analyzing ${i + 1}/${items.length}...`);
        setBulkItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'analyzing' } : it));

        try {
          let imageBlob: Blob;
          if (items[i].isVideo) {
            imageBlob = await extractVideoThumbnail(items[i].file);
          } else {
            imageBlob = await compressImage(items[i].file);
          }
          const base64 = await blobToBase64(imageBlob);
          const { data, error } = await supabase.functions.invoke('ai-generate-product', {
            body: { imageBase64: base64, mimeType: 'image/jpeg' },
          });
          if (error) throw error;
          setBulkItems(prev => prev.map((it, idx) => idx === i ? {
            ...it, status: 'ready',
            name: data.name || 'New Product',
            description: data.description || '',
            price: (data.price || 5000).toString(),
            category: data.category || 'Uncategorized',
          } : it));
        } catch (err: any) {
          console.error('AI analysis failed for item', i, err);
          setBulkItems(prev => prev.map((it, idx) => idx === i ? {
            ...it, status: 'error', error: err.message || 'Analysis failed',
            name: items[i].file.name.replace(/\.[^/.]+$/, ''),
            description: '', price: '5000', category: 'Uncategorized',
          } : it));
        }

        // 1s delay between calls to avoid rate limits
        if (i < items.length - 1) await new Promise(r => setTimeout(r, 1000));
      }
      setBulkProcessing(false);
      setBulkProgress('');
    }
  };

  const updateBulkItem = (id: string, field: keyof BulkItem, value: string) => {
    setBulkItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const removeBulkItem = (id: string) => {
    setBulkItems(prev => prev.filter(it => it.id !== id));
  };

  const handleCreateAllBulk = async () => {
    // Check bulk upload limit
    const { allowed, remaining, resetTime } = checkBulkUploadLimit();
    if (!allowed) {
      toast({ 
        title: "Daily limit reached", 
        description: `You've used all ${BULK_UPLOAD_LIMIT} bulk uploads today. Next reset at ${resetTime}.`, 
        variant: "destructive" 
      });
      setBulkProcessing(false);
      return;
    }

    setBulkProcessing(true);
    let created = 0;
    for (let i = 0; i < bulkItems.length; i++) {
      const item = bulkItems[i];
      if (item.status === 'done') continue;
      setBulkProgress(`Creating ${i + 1}/${bulkItems.length}...`);
      setBulkItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'creating' } : it));

      try {
        // Upload media
        let image_url: string | null = null;
        let video_url: string | null = null;

        if (item.isVideo) {
          const videoFileName = `${Math.random()}.${item.file.name.split('.').pop() || 'mp4'}`;
          await retryWithBackoff(async () => {
            const { error } = await supabase.storage.from('product-videos').upload(videoFileName, item.file);
            if (error) throw error;
          });
          video_url = supabase.storage.from('product-videos').getPublicUrl(videoFileName).data.publicUrl;

          // Also upload thumbnail as product image
          try {
            const thumb = await extractVideoThumbnail(item.file);
            const thumbName = `${Math.random()}.jpg`;
            await supabase.storage.from('product-images').upload(thumbName, thumb);
            image_url = supabase.storage.from('product-images').getPublicUrl(thumbName).data.publicUrl;
          } catch {}
        } else {
          const compressed = await compressImage(item.file);
          const fileName = `${Math.random()}.jpg`;
          await retryWithBackoff(async () => {
            const { error } = await supabase.storage.from('product-images').upload(fileName, compressed);
            if (error) throw error;
          });
          image_url = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
        }

        const { error } = await retryWithBackoff(async () => {
          return await supabase.from('products').insert([{
            name: item.name,
            description: item.description || null,
            price: parseFloat(item.price) || 5000,
            quantity: 7, // Changed from 0 to 7
            featured: false,
            image_url, video_url,
            category: item.category || 'Uncategorized',
            display_order: (products?.length || 0) + i + 1,
          }]);
        });
        if (error) throw error;
        setBulkItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'done' } : it));
        created++;
      } catch (err: any) {
        console.error('Failed to create bulk product:', item.name, err);
        setBulkItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'error', error: err.message } : it));
      }
    }

    // After successful creation, increment the counter
    if (created > 0) {
      incrementBulkUploadCount();
      const { remaining: newRemaining } = checkBulkUploadLimit();
      toast({ 
        title: `${created} product${created > 1 ? 's' : ''} created!`,
        description: `You have ${newRemaining} bulk upload${newRemaining !== 1 ? 's' : ''} remaining today.`
      });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    }
    
    setBulkProcessing(false);
    setBulkProgress('');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && filteredProducts) {
      const oldIndex = filteredProducts.findIndex(p => p.id === active.id);
      const newIndex = filteredProducts.findIndex(p => p.id === over.id);
      const newOrder = arrayMove(filteredProducts, oldIndex, newIndex);
      queryClient.setQueryData(['admin-products'], (old: Product[] | undefined) => {
        if (!old) return newOrder;
        const otherProducts = old.filter(p => !filteredProducts.find(fp => fp.id === p.id));
        return [...newOrder, ...otherProducts];
      });
      reorderMutation.mutate(newOrder.map(p => p.id));
    }
  };

  // Fix poor descriptions using AI
  const handleFixDescriptions = async () => {
    if (!products) return;
    setIsFixingDescriptions(true);
    
    const poorProducts = products.filter(p => {
      const desc = p.description || '';
      const hasRawPrice = /₦|naira|NGN\s?\d/i.test(desc);
      const hasImgName = /^IMG[-_]/i.test(p.name);
      return desc.length < 120 || hasRawPrice || hasImgName;
    });

    if (poorProducts.length === 0) {
      toast({ title: "All descriptions look good!", description: "No products with short descriptions found." });
      setIsFixingDescriptions(false);
      return;
    }

    toast({ title: `Fixing ${poorProducts.length} description${poorProducts.length > 1 ? 's' : ''}...`, description: "This may take a moment." });

    let fixed = 0;
    for (let i = 0; i < poorProducts.length; i++) {
      const product = poorProducts[i];
      toast({ title: `Fixing descriptions`, description: `${i + 1}/${poorProducts.length}: ${product.name}` });

      try {
        if (product.image_url) {
          const { data, error } = await supabase.functions.invoke('ai-generate-product', {
            body: { imageUrl: product.image_url, nameHint: product.name },
          });
          if (error) throw error;
          if (data?.description && data.description.length > 50) {
            const updateData: Record<string, string> = { description: data.description };
            // Also fix IMG- names
            if (/^IMG[-_]/i.test(product.name) && data?.name) {
              updateData.name = data.name;
            }
            await supabase.from('products').update(updateData).eq('id', product.id);
            fixed++;
          }
        }
      } catch (err) {
        console.error('Failed to fix description for:', product.name, err);
      }

      if (i < poorProducts.length - 1) await new Promise(r => setTimeout(r, 1500));
    }

    setIsFixingDescriptions(false);
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    toast({ title: `Fixed ${fixed}/${poorProducts.length} descriptions`, description: "Product descriptions have been updated." });
  };

  const toggleCategorySelection = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryId)
        ? prev.selectedCategories.filter(id => id !== categoryId)
        : [...prev.selectedCategories, categoryId],
    }));
  };

  const filteredProducts = products?.filter(product => {
    if (filterCategory !== 'all') {
      const productCats = productCategories?.[product.id] || [];
      if (!productCats.includes(filterCategory)) return false;
    }
    if (filterCollection !== 'all') {
      if (filterCollection === 'none' && product.collection_id) return false;
      if (filterCollection !== 'none' && product.collection_id !== filterCollection) return false;
    }
    return true;
  });

  const isSubmitting = createProductMutation.isPending || updateProductMutation.isPending;

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;

  // Get remaining uses for today
  const { remaining: remainingUses } = checkBulkUploadLimit();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link to="/admin" className="flex items-center text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />Back to Dashboard
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">Product Management</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        {!isOnline && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span className="text-sm">You're offline. You can still add products — they'll sync when you're back online.</span>
          </div>
        )}

        {pendingCount > 0 && (
          <div className="mb-4 p-3 bg-accent/10 border border-accent/20 rounded-lg flex items-center gap-2 text-foreground">
            {isSyncing ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Clock className="h-4 w-4 shrink-0" />}
            <span className="text-sm font-medium">
              {isSyncing ? 'Syncing offline products...' : `${pendingCount} product${pendingCount > 1 ? 's' : ''} waiting to upload`}
            </span>
            {isOnline && !isSyncing && (
              <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={syncOfflineQueue}>
                <CloudUpload className="h-3 w-3 mr-1" />Sync Now
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg sm:text-xl font-semibold">Products ({filteredProducts?.length || 0})</h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => batchCategorizeMutation.mutate()} disabled={batchCategorizeMutation.isPending} size="sm" className="flex-1 sm:flex-none">
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{batchCategorizeMutation.isPending ? 'Categorizing...' : 'AI Categorize'}</span>
                <span className="sm:hidden">AI</span>
              </Button>

              <Button variant="outline" onClick={handleFixDescriptions} disabled={isFixingDescriptions} size="sm" className="flex-1 sm:flex-none">
                {isFixingDescriptions ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                <span className="hidden sm:inline">{isFixingDescriptions ? 'Fixing...' : 'Fix Descriptions'}</span>
                <span className="sm:hidden">Fix</span>
              </Button>

              {/* Bulk Upload Button with usage indicator */}
              <Dialog open={isBulkDialogOpen} onOpenChange={(open) => { 
                setIsBulkDialogOpen(open); 
                if (!open) { 
                  setBulkItems([]); 
                  setBulkProcessing(false); 
                  setBulkProgress(''); 
                } else {
                  // Check limit when opening dialog
                  const { allowed, resetTime } = checkBulkUploadLimit();
                  if (!allowed) {
                    toast({ 
                      title: "Daily limit reached", 
                      description: `You've used all ${BULK_UPLOAD_LIMIT} bulk uploads today. Next reset at ${resetTime}.`, 
                      variant: "destructive" 
                    });
                    setIsBulkDialogOpen(false);
                  }
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none relative">
                    <ImagePlus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Bulk Upload</span>
                    <span className="sm:hidden">Bulk</span>
                    {remainingUses > 0 && (
                      <Badge variant="secondary" className="ml-2 text-[10px] hidden sm:inline-flex">
                        {remainingUses}/{BULK_UPLOAD_LIMIT}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      Bulk Upload Products ({bulkItems.length}/{MAX_BULK_FILES})
                      {remainingUses > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {remainingUses} of {BULK_UPLOAD_LIMIT} uses left today
                        </Badge>
                      )}
                    </DialogTitle>
                  </DialogHeader>

                  {bulkItems.length === 0 ? (
                    <div
                      className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => bulkFileRef.current?.click()}
                    >
                      <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm font-medium">Drop files or click to select</p>
                      <p className="text-xs text-muted-foreground mt-1">Max {MAX_BULK_FILES} images/videos. AI will generate product info for each.</p>
                      <p className="text-xs text-primary mt-2">You have {remainingUses} bulk upload{remainingUses !== 1 ? 's' : ''} remaining today.</p>
                      <input
                        ref={bulkFileRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={handleBulkFilesSelected}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bulkProgress && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {bulkProgress}
                        </div>
                      )}

                      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                        {bulkItems.map((item) => (
                          <Card key={item.id} className="overflow-hidden">
                            <CardContent className="p-3">
                              <div className="flex gap-3">
                                <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-muted">
                                  {item.thumbnailUrl ? (
                                    <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No preview</div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex items-center gap-2">
                                    {item.status === 'analyzing' && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                    {item.status === 'ready' && <Badge variant="secondary" className="text-[10px]">✅ AI Ready</Badge>}
                                    {item.status === 'error' && <Badge variant="destructive" className="text-[10px]">⚠️ {item.error?.slice(0, 30)}</Badge>}
                                    {item.status === 'creating' && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {item.status === 'done' && <Badge className="text-[10px] bg-green-600">✅ Created</Badge>}
                                    {item.isVideo && <Badge variant="outline" className="text-[10px]"><Video className="h-2 w-2 mr-0.5" />Video</Badge>}
                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto" onClick={() => removeBulkItem(item.id)} disabled={bulkProcessing}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <Input
                                    value={item.name}
                                    onChange={(e) => updateBulkItem(item.id, 'name', e.target.value)}
                                    placeholder="Product name"
                                    className="h-7 text-xs"
                                    disabled={item.status === 'analyzing' || item.status === 'creating' || item.status === 'done'}
                                  />
                                  <div className="flex gap-2">
                                    <Input
                                      value={item.price}
                                      onChange={(e) => updateBulkItem(item.id, 'price', e.target.value)}
                                      placeholder="Price"
                                      type="number"
                                      className="h-7 text-xs w-24"
                                      disabled={item.status === 'analyzing' || item.status === 'creating' || item.status === 'done'}
                                    />
                                    <Input
                                      value={item.category}
                                      onChange={(e) => updateBulkItem(item.id, 'category', e.target.value)}
                                      placeholder="Category"
                                      className="h-7 text-xs flex-1"
                                      disabled={item.status === 'analyzing' || item.status === 'creating' || item.status === 'done'}
                                    />
                                  </div>
                                  <Textarea
                                    value={item.description}
                                    onChange={(e) => updateBulkItem(item.id, 'description', e.target.value)}
                                    placeholder="Description"
                                    rows={2}
                                    className="text-xs resize-none"
                                    disabled={item.status === 'analyzing' || item.status === 'creating' || item.status === 'done'}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleCreateAllBulk}
                          disabled={bulkProcessing || bulkItems.every(i => i.status === 'done')}
                          className="flex-1"
                        >
                          {bulkProcessing ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                          ) : (
                            <><Plus className="h-4 w-4 mr-2" />Create All Products</>
                          )}
                        </Button>
                        <Button variant="outline" onClick={() => { setBulkItems([]); setBulkProgress(''); }} disabled={bulkProcessing}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateDialog} size="sm" className="flex-1 sm:flex-none">
                    <Plus className="h-4 w-4 mr-2" />Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Product Name</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={isSubmitting} />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} disabled={isSubmitting} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Price</Label>
                        <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required disabled={isSubmitting} />
                      </div>
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input id="quantity" type="number" min="0" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required disabled={isSubmitting} />
                      </div>
                    </div>

                    {/* Discount Pricing Section */}
                    <div className="space-y-3 border rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Switch id="discount-toggle" checked={discountEnabled} onCheckedChange={setDiscountEnabled} disabled={isSubmitting} />
                        <Label htmlFor="discount-toggle" className="font-medium">Enable Discount</Label>
                      </div>
                      {discountEnabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="original_price">Original Price</Label>
                            <Input id="original_price" type="number" step="0.01" placeholder="e.g. 15000" value={formData.original_price} onChange={(e) => setFormData({ ...formData, original_price: e.target.value })} disabled={isSubmitting} />
                          </div>
                          <div>
                            <Label htmlFor="discount_price">Sale Price</Label>
                            <Input id="discount_price" type="number" step="0.01" placeholder="e.g. 8500" value={formData.discount_price} onChange={(e) => setFormData({ ...formData, discount_price: e.target.value })} disabled={isSubmitting} />
                          </div>
                          {formData.original_price && formData.discount_price && parseFloat(formData.discount_price) < parseFloat(formData.original_price) && (
                            <p className="text-xs text-green-600 col-span-2">
                              {Math.round((1 - parseFloat(formData.discount_price) / parseFloat(formData.original_price)) * 100)}% discount applied
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="collection">Collection</Label>
                      <Select value={formData.collection_id || "none"} onValueChange={(value) => setFormData({ ...formData, collection_id: value === "none" ? "" : value })} disabled={isSubmitting}>
                        <SelectTrigger><SelectValue placeholder="No collection" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No collection</SelectItem>
                          {collections?.map(col => <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Categories</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
                        {categories?.map(cat => (
                          <div key={cat.id} className="flex items-center space-x-2">
                            <Checkbox id={`cat-${cat.id}`} checked={formData.selectedCategories.includes(cat.id)} onCheckedChange={() => toggleCategorySelection(cat.id)} disabled={isSubmitting} />
                            <label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer truncate">{cat.name}</label>
                          </div>
                        ))}
                        {(!categories || categories.length === 0) && <p className="text-sm text-muted-foreground col-span-2">No categories. Create some first.</p>}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="image">Product Image (max 5MB)</Label>
                      <Input id="image" type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.size > MAX_IMAGE_SIZE) { toast({ title: "Image too large", description: "Please select an image under 5MB.", variant: "destructive" }); e.target.value = ''; return; }
                        setFormData({ ...formData, image: file || null });
                      }} disabled={isSubmitting} />
                      <p className="text-xs text-muted-foreground mt-1">{!isOnline ? 'Image will be cached locally and uploaded when online.' : 'Images will be automatically compressed.'}</p>
                    </div>

                    <div>
                      <Label htmlFor="video">Product Video (max 50MB)</Label>
                      <Input id="video" type="file" accept="video/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.size > MAX_VIDEO_SIZE) { toast({ title: "Video too large", description: "Please select a video under 50MB.", variant: "destructive" }); e.target.value = ''; return; }
                        setFormData({ ...formData, video: file || null });
                      }} disabled={isSubmitting} />
                      <p className="text-xs text-muted-foreground mt-1">{!isOnline ? 'Video will be cached locally and uploaded when online.' : 'Supported formats: MP4, WebM, MOV.'}</p>
                      {editingProduct?.video_url && !formData.video && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-green-600"><Video className="h-3 w-3" /><span>Current product has a video</span></div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="featured" checked={formData.featured} onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })} disabled={isSubmitting} />
                      <Label htmlFor="featured">Featured Product</Label>
                    </div>

                    {uploadProgress && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{uploadProgress}</div>
                        <Progress value={progressValue} className="h-2" />
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button type="submit" disabled={isSubmitting} className="flex-1">
                        {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />{editingProduct ? 'Updating...' : 'Creating...'}</>) : (`${editingProduct ? 'Update' : 'Create'} Product`)}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories?.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCollection} onValueChange={setFilterCollection}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All collections" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All collections</SelectItem>
                <SelectItem value="none">No collection</SelectItem>
                {collections?.map(col => <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">Drag and drop products to reorder. Use filters to view by category or collection.</p>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredProducts?.map(p => p.id) || []} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filteredProducts?.map((product) => (
                <SortableProduct key={product.id} product={product} categories={categories || []} productCategories={productCategories || {}} collections={collections || []} onEdit={openEditDialog} onDelete={(id) => deleteProductMutation.mutate(id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {filteredProducts?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No products found. {filterCategory !== 'all' || filterCollection !== 'all' ? 'Try adjusting your filters.' : 'Add your first product.'}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminProducts;