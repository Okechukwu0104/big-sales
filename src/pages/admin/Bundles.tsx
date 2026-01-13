import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bundle, Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Edit, Trash2, Package, Star, ImageIcon, 
  Search, X, Check, GripVertical 
} from 'lucide-react';
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

interface BundleWithProducts extends Bundle {
  bundle_products?: {
    id: string;
    product_id: string;
    quantity: number;
    product: Product;
  }[];
}

const SortableBundleItem = ({ 
  bundle, 
  onEdit, 
  onDelete,
  formatPrice 
}: { 
  bundle: BundleWithProducts; 
  onEdit: () => void; 
  onDelete: () => void;
  formatPrice: (price: number) => string;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: bundle.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const savings = bundle.original_price - bundle.bundle_price;
  const savingsPercent = bundle.original_price > 0 
    ? Math.round((savings / bundle.original_price) * 100) 
    : 0;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className={`${!bundle.is_active ? 'opacity-60' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <button
              {...listeners}
              className="mt-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-5 w-5" />
            </button>
            
            <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
              {bundle.image_url ? (
                <img src={bundle.image_url} alt={bundle.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-lg">{bundle.name}</h3>
                {bundle.is_featured && (
                  <Badge className="bg-amber-500 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
                {!bundle.is_active && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              
              {bundle.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{bundle.description}</p>
              )}
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(bundle.original_price)}
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(bundle.bundle_price)}
                  </span>
                </div>
                {savingsPercent > 0 && (
                  <Badge variant="destructive">
                    Save {savingsPercent}%
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground mt-1">
                {bundle.bundle_products?.length || 0} products
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const AdminBundles = () => {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<BundleWithProducts | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<{ product: Product; quantity: number }[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    bundle_price: '',
    is_active: true,
    is_featured: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch bundles with products
  const { data: bundles, isLoading } = useQuery({
    queryKey: ['admin-bundles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bundles')
        .select(`
          *,
          bundle_products (
            id,
            product_id,
            quantity,
            product:products (*)
          )
        `)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as BundleWithProducts[];
    },
  });

  // Fetch all products for selection
  const { data: products } = useQuery({
    queryKey: ['products-for-bundles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    },
  });

  // Calculate original price from selected products
  const calculatedOriginalPrice = selectedProducts.reduce(
    (sum, item) => sum + (item.product.price * item.quantity),
    0
  );

  // Create bundle mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: bundle, error: bundleError } = await supabase
        .from('bundles')
        .insert({
          name: formData.name,
          description: formData.description || null,
          image_url: formData.image_url || null,
          original_price: calculatedOriginalPrice,
          bundle_price: parseFloat(formData.bundle_price) || 0,
          is_active: formData.is_active,
          is_featured: formData.is_featured,
          display_order: (bundles?.length || 0) + 1,
        })
        .select()
        .single();
      
      if (bundleError) throw bundleError;

      if (selectedProducts.length > 0) {
        const bundleProducts = selectedProducts.map(item => ({
          bundle_id: bundle.id,
          product_id: item.product.id,
          quantity: item.quantity,
        }));

        const { error: productsError } = await supabase
          .from('bundle_products')
          .insert(bundleProducts);
        
        if (productsError) throw productsError;
      }

      return bundle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
      toast({ title: 'Bundle created successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Failed to create bundle', variant: 'destructive' });
    },
  });

  // Update bundle mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingBundle) return;

      const { error: bundleError } = await supabase
        .from('bundles')
        .update({
          name: formData.name,
          description: formData.description || null,
          image_url: formData.image_url || null,
          original_price: calculatedOriginalPrice,
          bundle_price: parseFloat(formData.bundle_price) || 0,
          is_active: formData.is_active,
          is_featured: formData.is_featured,
        })
        .eq('id', editingBundle.id);
      
      if (bundleError) throw bundleError;

      // Delete existing products and re-add
      await supabase
        .from('bundle_products')
        .delete()
        .eq('bundle_id', editingBundle.id);

      if (selectedProducts.length > 0) {
        const bundleProducts = selectedProducts.map(item => ({
          bundle_id: editingBundle.id,
          product_id: item.product.id,
          quantity: item.quantity,
        }));

        const { error: productsError } = await supabase
          .from('bundle_products')
          .insert(bundleProducts);
        
        if (productsError) throw productsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
      toast({ title: 'Bundle updated successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Failed to update bundle', variant: 'destructive' });
    },
  });

  // Delete bundle mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bundles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
      toast({ title: 'Bundle deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete bundle', variant: 'destructive' });
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (orderedBundles: Bundle[]) => {
      const updates = orderedBundles.map((bundle, index) => ({
        id: bundle.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from('bundles')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && bundles) {
      const oldIndex = bundles.findIndex((b) => b.id === active.id);
      const newIndex = bundles.findIndex((b) => b.id === over.id);
      
      const newOrder = arrayMove(bundles, oldIndex, newIndex);
      reorderMutation.mutate(newOrder);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      bundle_price: '',
      is_active: true,
      is_featured: false,
    });
    setSelectedProducts([]);
    setEditingBundle(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (bundle: BundleWithProducts) => {
    setEditingBundle(bundle);
    setFormData({
      name: bundle.name,
      description: bundle.description || '',
      image_url: bundle.image_url || '',
      bundle_price: bundle.bundle_price.toString(),
      is_active: bundle.is_active,
      is_featured: bundle.is_featured,
    });
    setSelectedProducts(
      bundle.bundle_products?.map(bp => ({
        product: bp.product,
        quantity: bp.quantity,
      })) || []
    );
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: 'Please enter a bundle name', variant: 'destructive' });
      return;
    }
    
    if (editingBundle) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const addProduct = (product: Product) => {
    const existing = selectedProducts.find(p => p.product.id === product.id);
    if (existing) {
      setSelectedProducts(prev =>
        prev.map(p =>
          p.product.id === product.id
            ? { ...p, quantity: p.quantity + 1 }
            : p
        )
      );
    } else {
      setSelectedProducts(prev => [...prev, { product, quantity: 1 }]);
    }
    setProductSearch('');
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product.id === productId ? { ...p, quantity } : p
      )
    );
  };

  const filteredBundles = bundles?.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
    !selectedProducts.some(sp => sp.product.id === p.id)
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">Bundles Management</h1>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Bundle
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bundles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Bundles List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-muted rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-muted rounded w-1/3" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBundles && filteredBundles.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredBundles.map(b => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {filteredBundles.map((bundle) => (
                  <SortableBundleItem
                    key={bundle.id}
                    bundle={bundle}
                    onEdit={() => openEditDialog(bundle)}
                    onDelete={() => deleteMutation.mutate(bundle.id)}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No bundles yet</h3>
              <p className="text-muted-foreground mb-4">
                Create bundles to group products together and offer special pricing.
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Bundle
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBundle ? 'Edit Bundle' : 'Create Bundle'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label>Bundle Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Home Starter Kit"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what's included in this bundle..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Product Selection */}
              <div>
                <Label>Products in Bundle</Label>
                <div className="mt-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products to add..."
                    className="pl-10"
                  />
                  
                  {productSearch && filteredProducts && filteredProducts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                      {filteredProducts.slice(0, 10).map(product => (
                        <button
                          key={product.id}
                          onClick={() => addProduct(product)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-muted text-left"
                        >
                          <div className="w-10 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                            {product.image_url ? (
                              <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{product.name}</div>
                            <div className="text-sm text-muted-foreground">{formatPrice(product.price)}</div>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Products */}
                <div className="mt-4 space-y-2">
                  {selectedProducts.map(item => (
                    <div key={item.product.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-10 h-10 bg-background rounded overflow-hidden flex-shrink-0">
                        {item.product.image_url ? (
                          <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.product.name}</div>
                        <div className="text-sm text-muted-foreground">{formatPrice(item.product.price)} each</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProduct(item.product.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {selectedProducts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No products added yet. Search and add products above.
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Original Price (sum of products)</span>
                  <span className="font-medium">{formatPrice(calculatedOriginalPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Bundle Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.bundle_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, bundle_price: e.target.value }))}
                    placeholder="0.00"
                    className="w-32 text-right"
                  />
                </div>
                {parseFloat(formData.bundle_price) > 0 && calculatedOriginalPrice > 0 && (
                  <div className="flex items-center justify-between text-primary font-medium">
                    <span>Customer Savings</span>
                    <span>
                      {formatPrice(calculatedOriginalPrice - parseFloat(formData.bundle_price))} 
                      ({Math.round(((calculatedOriginalPrice - parseFloat(formData.bundle_price)) / calculatedOriginalPrice) * 100)}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_featured"
                    checked={formData.is_featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                  />
                  <Label htmlFor="is_featured">Featured on Homepage</Label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 
                   editingBundle ? 'Update Bundle' : 'Create Bundle'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminBundles;
