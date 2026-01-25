import { useState } from 'react';
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
import { ArrowLeft, Plus, Edit, Trash2, Sparkles, GripVertical, Filter, FolderOpen, Layers, Loader2, WifiOff } from 'lucide-react';
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
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_DIMENSION = 1200;
const IMAGE_QUALITY = 0.8;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Utility: Compress image before upload
const compressImage = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      
      // Scale down if larger than max dimension
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = (height / width) * MAX_IMAGE_DIMENSION;
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = (width / height) * MAX_IMAGE_DIMENSION;
          height = MAX_IMAGE_DIMENSION;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to compress image'));
        },
        'image/jpeg',
        IMAGE_QUALITY
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
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

interface SortableProductProps {
  product: Product;
  categories: Category[];
  productCategories: Record<string, string[]>;
  collections: Collection[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

const SortableProduct = ({ product, categories, productCategories, collections, onEdit, onDelete }: SortableProductProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const productCategoryNames = (productCategories[product.id] || [])
    .map(catId => categories.find(c => c.id === catId)?.name)
    .filter(Boolean);

  const collection = collections.find(c => c.id === product.collection_id);

  return (
    <Card ref={setNodeRef} style={style} className="mb-2">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none flex-shrink-0 mt-1 sm:mt-0"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          
          {product.image_url && (
            <img 
              src={product.image_url} 
              alt={product.name}
              loading="lazy"
              width={64}
              height={64}
              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded flex-shrink-0"
            />
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate">{product.name}</h3>
            <p className="text-muted-foreground text-xs sm:text-sm line-clamp-1">{product.description}</p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <p className="font-bold text-primary text-sm">₦{product.price}</p>
              <span className={`text-xs px-2 py-0.5 rounded ${
                product.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {product.in_stock ? `${product.quantity} in stock` : 'Out of stock'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {productCategoryNames.map((name, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  <FolderOpen className="h-3 w-3 mr-1" />
                  {name}
                </Badge>
              ))}
              {collection && (
                <Badge variant="outline" className="text-xs">
                  <Layers className="h-3 w-3 mr-1" />
                  {collection.name}
                </Badge>
              )}
              {product.featured && (
                <Badge className="text-xs">Featured</Badge>
              )}
            </div>
          </div>
          
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => onEdit(product)} className="h-8 w-8 p-0 sm:h-9 sm:w-9">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(product.id)} className="h-8 w-8 p-0 sm:h-9 sm:w-9">
              <Trash2 className="h-4 w-4" />
            </Button>
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
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterCollection, setFilterCollection] = useState<string>('all');
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [progressValue, setProgressValue] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    featured: false,
    image: null as File | null,
    collection_id: '',
    selectedCategories: [] as string[],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: collections } = useQuery({
    queryKey: ['admin-collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Collection[];
    },
  });

  const { data: productCategories } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*');
      
      if (error) throw error;
      
      const map: Record<string, string[]> = {};
      data.forEach(pc => {
        if (!map[pc.product_id]) map[pc.product_id] = [];
        map[pc.product_id].push(pc.category_id);
      });
      return map;
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (productData: {
      name: string;
      description: string | null;
      price: number;
      quantity: number;
      featured: boolean;
      collection_id: string | null;
    }) => {
      // Check network connectivity
      if (!navigator.onLine) {
        throw new Error('You appear to be offline. Please check your connection and try again.');
      }

      let image_url = null;
      
      if (formData.image) {
        // Validate file size before processing
        if (formData.image.size > MAX_IMAGE_SIZE) {
          throw new Error('Image is too large. Please use an image under 5MB.');
        }

        setUploadProgress('Compressing image...');
        setProgressValue(10);
        
        // Compress image before upload
        const compressedBlob = await compressImage(formData.image);
        const compressedFile = new File([compressedBlob], formData.image.name, { type: 'image/jpeg' });
        
        setUploadProgress('Uploading image...');
        setProgressValue(30);
        
        const fileExt = 'jpg'; // Always save as jpg after compression
        const fileName = `${Math.random()}.${fileExt}`;
        
        // Upload with retry logic
        await retryWithBackoff(async () => {
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, compressedFile);
          
          if (uploadError) throw uploadError;
        });
        
        setProgressValue(60);
        
        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        image_url = data.publicUrl;
      }

      setUploadProgress('Saving product...');
      setProgressValue(70);

      // Create product IMMEDIATELY with "Uncategorized" - don't wait for AI
      const { data: newProduct, error } = await retryWithBackoff(async () => {
        const result = await supabase
          .from('products')
          .insert([{ 
            ...productData, 
            image_url, 
            category: 'Uncategorized', // Default, AI updates later
            display_order: (products?.length || 0) + 1 
          }])
          .select()
          .single();
        
        if (result.error) throw result.error;
        return result;
      });

      setProgressValue(85);

      // Add category relationships
      if (formData.selectedCategories.length > 0) {
        const categoryInserts = formData.selectedCategories.map(catId => ({
          product_id: newProduct.id,
          category_id: catId,
        }));
        await retryWithBackoff(async () => {
          const { error } = await supabase.from('product_categories').insert(categoryInserts);
          if (error) throw error;
        });
      }

      setUploadProgress('Product saved! AI categorizing in background...');
      setProgressValue(100);

      // Trigger AI categorization in background (NON-BLOCKING)
      // This runs AFTER the product is already saved
      supabase.functions.invoke('categorize-product', {
        body: { 
          productName: productData.name, 
          productDescription: productData.description 
        }
      }).then(({ data: categoryData }) => {
        if (categoryData?.category && categoryData.category !== 'Uncategorized') {
          supabase
            .from('products')
            .update({ category: categoryData.category })
            .eq('id', newProduct.id)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            });
        }
      }).catch(err => {
        console.log('Background AI categorization failed, product saved with default category:', err);
      });

      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: "Product created successfully" });
      resetForm();
      setIsDialogOpen(false);
      setUploadProgress('');
      setProgressValue(0);
    },
    onError: (error) => {
      toast({ title: "Error creating product", description: error.message, variant: "destructive" });
      setUploadProgress('');
      setProgressValue(0);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (productData: {
      name: string;
      description: string | null;
      price: number;
      quantity: number;
      featured: boolean;
      collection_id: string | null;
    }) => {
      // Check network connectivity
      if (!navigator.onLine) {
        throw new Error('You appear to be offline. Please check your connection and try again.');
      }

      let updateData: Record<string, unknown> = { ...productData };
      
      if (formData.image) {
        // Validate file size
        if (formData.image.size > MAX_IMAGE_SIZE) {
          throw new Error('Image is too large. Please use an image under 5MB.');
        }

        setUploadProgress('Compressing image...');
        setProgressValue(10);
        
        // Compress image before upload
        const compressedBlob = await compressImage(formData.image);
        const compressedFile = new File([compressedBlob], formData.image.name, { type: 'image/jpeg' });
        
        setUploadProgress('Uploading image...');
        setProgressValue(40);
        
        const fileName = `${Math.random()}.jpg`;
        
        // Upload with retry logic
        await retryWithBackoff(async () => {
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, compressedFile);
          
          if (uploadError) throw uploadError;
        });
        
        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        updateData.image_url = data.publicUrl;
      }

      setUploadProgress('Updating product...');
      setProgressValue(70);

      const { data, error } = await retryWithBackoff(async () => {
        const result = await supabase
          .from('products')
          .update(updateData)
          .eq('id', editingProduct!.id)
          .select()
          .single();
        
        if (result.error) throw result.error;
        return result;
      });

      setProgressValue(85);

      // Update category relationships
      await supabase.from('product_categories').delete().eq('product_id', editingProduct!.id);
      
      if (formData.selectedCategories.length > 0) {
        const categoryInserts = formData.selectedCategories.map(catId => ({
          product_id: editingProduct!.id,
          category_id: catId,
        }));
        await retryWithBackoff(async () => {
          const { error } = await supabase.from('product_categories').insert(categoryInserts);
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
      resetForm();
      setIsDialogOpen(false);
      setUploadProgress('');
      setProgressValue(0);
    },
    onError: (error) => {
      toast({ title: "Error updating product", description: error.message, variant: "destructive" });
      setUploadProgress('');
      setProgressValue(0);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      // Optimistic update - remove from list immediately
      queryClient.setQueryData(['admin-products'], (old: Product[] | undefined) => 
        old?.filter(p => p.id !== productId)
      );

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
      // Rollback optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: "Error deleting product", description: error.message, variant: "destructive" });
    },
  });

  const batchCategorizeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('batch-categorize');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ 
        title: "Batch categorization complete", 
        description: data?.message || "Products have been categorized"
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error categorizing products", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase.from('products').update({ display_order: index }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const resetForm = () => {
    setFormData({ 
      name: '', 
      description: '', 
      price: '', 
      quantity: '', 
      featured: false, 
      image: null,
      collection_id: '',
      selectedCategories: [],
    });
    setEditingProduct(null);
    setUploadProgress('');
    setProgressValue(0);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      quantity: product.quantity?.toString() || '0',
      featured: product.featured,
      image: null,
      collection_id: product.collection_id || '',
      selectedCategories: productCategories?.[product.id] || [],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check network before submitting
    if (!navigator.onLine) {
      toast({ 
        title: "You're offline", 
        description: "Please check your internet connection and try again.", 
        variant: "destructive" 
      });
      return;
    }
    
    const productData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity) || 0,
      featured: formData.featured,
      collection_id: formData.collection_id || null,
    };

    if (editingProduct) {
      updateProductMutation.mutate(productData);
    } else {
      createProductMutation.mutate(productData);
    }
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

  const toggleCategorySelection = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryId)
        ? prev.selectedCategories.filter(id => id !== categoryId)
        : [...prev.selectedCategories, categoryId],
    }));
  };

  // Filter products
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link to="/admin" className="flex items-center text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">Product Management</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Offline Warning */}
        {!navigator.onLine && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">You appear to be offline. Some features may not work.</span>
          </div>
        )}

        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg sm:text-xl font-semibold">Products ({filteredProducts?.length || 0})</h2>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => batchCategorizeMutation.mutate()}
                disabled={batchCategorizeMutation.isPending}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{batchCategorizeMutation.isPending ? 'Categorizing...' : 'AI Categorize'}</span>
                <span className="sm:hidden">AI</span>
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateDialog} size="sm" className="flex-1 sm:flex-none">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? 'Edit Product' : 'Create New Product'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Product Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Price</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="0"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="collection">Collection</Label>
                      <Select 
                        value={formData.collection_id} 
                        onValueChange={(value) => setFormData({ ...formData, collection_id: value })}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="No collection" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No collection</SelectItem>
                          {collections?.map(col => (
                            <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Categories</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
                        {categories?.map(cat => (
                          <div key={cat.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cat-${cat.id}`}
                              checked={formData.selectedCategories.includes(cat.id)}
                              onCheckedChange={() => toggleCategorySelection(cat.id)}
                              disabled={isSubmitting}
                            />
                            <label htmlFor={`cat-${cat.id}`} className="text-sm cursor-pointer truncate">
                              {cat.name}
                            </label>
                          </div>
                        ))}
                        {(!categories || categories.length === 0) && (
                          <p className="text-sm text-muted-foreground col-span-2">No categories. Create some first.</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="image">Product Image (max 5MB)</Label>
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.size > MAX_IMAGE_SIZE) {
                            toast({
                              title: "Image too large",
                              description: "Please select an image under 5MB.",
                              variant: "destructive"
                            });
                            e.target.value = '';
                            return;
                          }
                          setFormData({ ...formData, image: file || null });
                        }}
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Images will be automatically compressed for faster upload.
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="featured"
                        checked={formData.featured}
                        onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                        disabled={isSubmitting}
                      />
                      <Label htmlFor="featured">Featured Product</Label>
                    </div>

                    {/* Progress indicator */}
                    {uploadProgress && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {uploadProgress}
                        </div>
                        <Progress value={progressValue} className="h-2" />
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="flex-1"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {editingProduct ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          `${editingProduct ? 'Update' : 'Create'} Product`
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCollection} onValueChange={setFilterCollection}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All collections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All collections</SelectItem>
                <SelectItem value="none">No collection</SelectItem>
                {collections?.map(col => (
                  <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Drag and drop products to reorder. Use filters to view by category or collection.
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={filteredProducts?.map(p => p.id) || []} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filteredProducts?.map((product) => (
                <SortableProduct
                  key={product.id}
                  product={product}
                  categories={categories || []}
                  productCategories={productCategories || {}}
                  collections={collections || []}
                  onEdit={openEditDialog}
                  onDelete={(id) => deleteProductMutation.mutate(id)}
                />
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
