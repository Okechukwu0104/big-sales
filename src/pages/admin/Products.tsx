import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Sparkles, GripVertical, FolderOpen, Package, Filter, X, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Product, Category, Collection, ProductCategory } from '@/types';
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

interface ProductWithRelations extends Product {
  categories: Category[];
  collection: Collection | null;
}

interface SortableProductItemProps {
  product: ProductWithRelations;
  onEdit: (product: ProductWithRelations) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  currencySymbol: string;
}

const SortableProductItem = ({ product, onEdit, onDelete, isDeleting, currencySymbol }: SortableProductItemProps) => {
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

  return (
    <Card ref={setNodeRef} style={style} className="touch-manipulation">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-4">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 sm:p-2 hover:bg-accent rounded-md touch-manipulation flex-shrink-0 mt-2"
          >
            <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          </button>
          
          {product.image_url && (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded flex-shrink-0"
            />
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate">{product.name}</h3>
            <p className="text-muted-foreground text-xs sm:text-sm line-clamp-1 hidden sm:block">{product.description}</p>
            
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
              <span className="font-bold text-primary text-sm">{currencySymbol}{product.price}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                product.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {product.in_stock ? `${product.quantity} in stock` : 'Out of stock'}
              </span>
              {product.featured && (
                <Badge variant="default" className="text-xs">Featured</Badge>
              )}
            </div>
            
            {/* Categories */}
            {product.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1 sm:mt-2">
                {product.categories.map(cat => (
                  <Badge key={cat.id} variant="outline" className="text-xs">
                    {cat.name}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Collection */}
            {product.collection && (
              <div className="mt-1">
                <Badge variant="secondary" className="text-xs">
                  <Layers className="h-3 w-3 mr-1" />
                  {product.collection.name}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="flex gap-1 sm:gap-2 flex-shrink-0">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit(product)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDelete(product.id)}
              disabled={isDeleting}
              className="h-8 w-8 p-0"
            >
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
  const [editingProduct, setEditingProduct] = useState<ProductWithRelations | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterCollection, setFilterCollection] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    featured: false,
    image: null as File | null,
    categoryIds: [] as string[],
    collectionId: '',
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

  // Fetch store config for currency
  const { data: storeConfig } = useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_config')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  const currencySymbol = storeConfig?.currency_symbol || '₦';

  // Fetch categories
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

  // Fetch collections
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

  // Fetch products with their categories and collections
  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products-extended'],
    queryFn: async () => {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (productsError) throw productsError;

      // Fetch product_categories
      const { data: productCategories } = await supabase
        .from('product_categories')
        .select('*');

      // Map products with their categories and collection
      return (productsData as Product[]).map(product => {
        const productCatIds = productCategories
          ?.filter(pc => pc.product_id === product.id)
          .map(pc => pc.category_id) || [];
        
        const productCats = categories?.filter(c => productCatIds.includes(c.id)) || [];
        const collection = collections?.find(c => c.id === product.collection_id) || null;

        return {
          ...product,
          categories: productCats,
          collection,
        } as ProductWithRelations;
      });
    },
    enabled: !!categories && !!collections,
  });

  // Filter products based on tab and filters
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    let filtered = products;

    // Tab filters
    if (activeTab === 'uncategorized') {
      filtered = filtered.filter(p => p.categories.length === 0);
    } else if (activeTab === 'by-category' && filterCategory) {
      filtered = filtered.filter(p => p.categories.some(c => c.id === filterCategory));
    } else if (activeTab === 'by-collection' && filterCollection) {
      filtered = filtered.filter(p => p.collection?.id === filterCollection);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [products, activeTab, filterCategory, filterCollection, searchTerm]);

  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      let image_url = null;
      
      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, formData.image);
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        image_url = data.publicUrl;
      }

      // Get AI-generated category
      const { data: categoryData } = await supabase.functions.invoke('categorize-product', {
        body: { 
          productName: productData.name, 
          productDescription: productData.description 
        }
      });

      const category = categoryData?.category || 'Uncategorized';
      const maxOrder = products?.reduce((max, p) => Math.max(max, p.display_order || 0), 0) || 0;

      const { data: newProduct, error } = await supabase
        .from('products')
        .insert([{ 
          ...productData, 
          image_url, 
          category, 
          quantity: parseInt(productData.quantity) || 0,
          collection_id: formData.collectionId || null,
          display_order: maxOrder + 1,
        }])
        .select()
        .single();
      
      if (error) throw error;

      // Add category relationships
      if (formData.categoryIds.length > 0) {
        const categoryInserts = formData.categoryIds.map(catId => ({
          product_id: newProduct.id,
          category_id: catId,
        }));
        
        await supabase
          .from('product_categories')
          .insert(categoryInserts);
      }

      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-extended'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({ title: "Product created successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error creating product", description: error.message, variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      let updateData = { ...productData };
      
      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, formData.image);
        
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        updateData.image_url = data.publicUrl;
      }

      const { error } = await supabase
        .from('products')
        .update({ 
          ...updateData, 
          quantity: parseInt(updateData.quantity) || 0,
          collection_id: formData.collectionId || null,
        })
        .eq('id', editingProduct!.id);
      
      if (error) throw error;

      // Update category relationships
      await supabase
        .from('product_categories')
        .delete()
        .eq('product_id', editingProduct!.id);

      if (formData.categoryIds.length > 0) {
        const categoryInserts = formData.categoryIds.map(catId => ({
          product_id: editingProduct!.id,
          category_id: catId,
        }));
        
        await supabase
          .from('product_categories')
          .insert(categoryInserts);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-extended'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({ title: "Product updated successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error updating product", description: error.message, variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-extended'] });
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({ title: "Product deleted successfully" });
    },
    onError: (error: any) => {
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
      queryClient.invalidateQueries({ queryKey: ['admin-products-extended'] });
      toast({ 
        title: "Batch categorization complete", 
        description: data?.message || "Products have been categorized"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error categorizing products", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from('products')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
        if (error) throw error;
      }
    },
    onError: (error: any) => {
      toast({ title: "Error reordering products", description: error.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ['admin-products-extended'] });
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
      categoryIds: [],
      collectionId: '',
    });
    setEditingProduct(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: ProductWithRelations) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      quantity: product.quantity?.toString() || '0',
      featured: product.featured,
      image: null,
      categoryIds: product.categories.map(c => c.id),
      collectionId: product.collection?.id || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      quantity: formData.quantity,
      featured: formData.featured,
    };

    if (editingProduct) {
      updateProductMutation.mutate(productData);
    } else {
      createProductMutation.mutate(productData);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !filteredProducts) return;

    const oldIndex = filteredProducts.findIndex(p => p.id === active.id);
    const newIndex = filteredProducts.findIndex(p => p.id === over.id);
    
    const newOrder = arrayMove(filteredProducts, oldIndex, newIndex);
    
    // Optimistically update
    queryClient.setQueryData(['admin-products-extended'], (old: ProductWithRelations[] | undefined) => {
      if (!old) return old;
      const updatedIds = newOrder.map(p => p.id);
      return old.map(p => {
        const newIdx = updatedIds.indexOf(p.id);
        if (newIdx !== -1) {
          return { ...p, display_order: newIdx };
        }
        return p;
      });
    });
    
    const updates = newOrder.map((p, index) => ({
      id: p.id,
      display_order: index,
    }));
    
    reorderMutation.mutate(updates);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('');
    setFilterCollection('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border sticky top-0 z-20">
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

      <main className="container mx-auto px-4 py-6">
        {/* Quick Links */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/categories">
              <FolderOpen className="h-4 w-4 mr-2" />
              Manage Categories
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/collections">
              <Package className="h-4 w-4 mr-2" />
              Manage Collections
            </Link>
          </Button>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => batchCategorizeMutation.mutate()}
              disabled={batchCategorizeMutation.isPending}
              className="flex-1 sm:flex-none"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">AI Categorize</span>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
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
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
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
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="image">Product Image</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, image: e.target.files?.[0] || null })}
                    />
                  </div>

                  {/* Categories Multi-select */}
                  <div>
                    <Label>Categories</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {categories && categories.length > 0 ? (
                        categories.map(cat => (
                          <div key={cat.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cat-${cat.id}`}
                              checked={formData.categoryIds.includes(cat.id)}
                              onCheckedChange={() => handleCategoryToggle(cat.id)}
                            />
                            <label 
                              htmlFor={`cat-${cat.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {cat.name}
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground col-span-2">
                          No categories yet. <Link to="/admin/categories" className="text-primary underline">Create one</Link>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Collection Select */}
                  <div>
                    <Label htmlFor="collection">Collection (Optional)</Label>
                    <Select
                      value={formData.collectionId}
                      onValueChange={(value) => setFormData({ ...formData, collectionId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a collection" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No collection</SelectItem>
                        {collections?.map(col => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                    />
                    <Label htmlFor="featured">Featured Product</Label>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={createProductMutation.isPending || updateProductMutation.isPending}
                      className="flex-1"
                    >
                      {editingProduct ? 'Update' : 'Create'} Product
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="flex flex-wrap h-auto gap-1 w-full sm:w-auto">
            <TabsTrigger value="all" className="flex-1 sm:flex-none">All ({products?.length || 0})</TabsTrigger>
            <TabsTrigger value="by-category" className="flex-1 sm:flex-none">By Category</TabsTrigger>
            <TabsTrigger value="by-collection" className="flex-1 sm:flex-none">By Collection</TabsTrigger>
            <TabsTrigger value="uncategorized" className="flex-1 sm:flex-none">
              Uncategorized ({products?.filter(p => p.categories.length === 0).length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="by-category" className="mt-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>

          <TabsContent value="by-collection" className="mt-4">
            <Select value={filterCollection} onValueChange={setFilterCollection}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select a collection" />
              </SelectTrigger>
              <SelectContent>
                {collections?.map(col => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>
        </Tabs>

        {/* Active Filters */}
        {(searchTerm || filterCategory || filterCollection) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchTerm}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchTerm('')} />
              </Badge>
            )}
            {filterCategory && (
              <Badge variant="secondary" className="gap-1">
                Category: {categories?.find(c => c.id === filterCategory)?.name}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterCategory('')} />
              </Badge>
            )}
            {filterCollection && (
              <Badge variant="secondary" className="gap-1">
                Collection: {collections?.find(c => c.id === filterCollection)?.name}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterCollection('')} />
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>
        )}

        {/* Products List */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            {activeTab === 'all' ? '' : ` • Drag to reorder`}
          </p>
        </div>

        {filteredProducts && filteredProducts.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredProducts.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {filteredProducts.map((product) => (
                  <SortableProductItem
                    key={product.id}
                    product={product}
                    onEdit={openEditDialog}
                    onDelete={(id) => deleteProductMutation.mutate(id)}
                    isDeleting={deleteProductMutation.isPending}
                    currencySymbol={currencySymbol}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterCategory || filterCollection 
                  ? 'Try adjusting your filters'
                  : 'Add your first product to get started'}
              </p>
              {!(searchTerm || filterCategory || filterCollection) && (
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminProducts;
