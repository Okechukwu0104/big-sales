import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, GripVertical, Package, Image } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collection, Product } from '@/types';
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

interface CollectionWithCount extends Collection {
  productCount: number;
}

interface SortableCollectionItemProps {
  collection: CollectionWithCount;
  onEdit: (collection: Collection) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

const SortableCollectionItem = ({ collection, onEdit, onDelete, isDeleting }: SortableCollectionItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: collection.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="touch-manipulation">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-2 hover:bg-accent rounded-md touch-manipulation"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          
          {collection.image_url ? (
            <img 
              src={collection.image_url} 
              alt={collection.name}
              className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <Image className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{collection.name}</h3>
            {collection.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">{collection.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Package className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {collection.productCount} {collection.productCount === 1 ? 'product' : 'products'}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2 flex-shrink-0">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit(collection)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDelete(collection.id)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const AdminCollections = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: null as File | null,
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

  const { data: collections, isLoading } = useQuery({
    queryKey: ['admin-collections'],
    queryFn: async () => {
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (collectionsError) throw collectionsError;

      // Get product counts for each collection
      const { data: products } = await supabase
        .from('products')
        .select('collection_id');

      const countMap: Record<string, number> = {};
      products?.forEach(p => {
        if (p.collection_id) {
          countMap[p.collection_id] = (countMap[p.collection_id] || 0) + 1;
        }
      });

      return (collectionsData as Collection[]).map(col => ({
        ...col,
        productCount: countMap[col.id] || 0,
      }));
    },
  });

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `collection-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    
    return data.publicUrl;
  };

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; image: File | null }) => {
      const maxOrder = collections?.reduce((max, col) => Math.max(max, col.display_order), 0) || 0;
      
      let image_url = null;
      if (data.image) {
        image_url = await uploadImage(data.image);
      }
      
      const { data: result, error } = await supabase
        .from('collections')
        .insert([{ 
          name: data.name, 
          description: data.description || null,
          image_url,
          display_order: maxOrder + 1
        }])
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
      toast({ title: "Collection created successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error creating collection", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string; image: File | null }) => {
      let updateData: any = { 
        name: data.name, 
        description: data.description || null 
      };
      
      if (data.image) {
        updateData.image_url = await uploadImage(data.image);
      }
      
      const { error } = await supabase
        .from('collections')
        .update(updateData)
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
      toast({ title: "Collection updated successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error updating collection", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: "Collection deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting collection", description: error.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from('collections')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
        if (error) throw error;
      }
    },
    onError: (error: any) => {
      toast({ title: "Error reordering collections", description: error.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', image: null });
    setEditingCollection(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (collection: Collection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      image: null,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCollection) {
      updateMutation.mutate({ id: editingCollection.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id || !collections) return;

    const oldIndex = collections.findIndex(col => col.id === active.id);
    const newIndex = collections.findIndex(col => col.id === over.id);
    
    const newOrder = arrayMove(collections, oldIndex, newIndex);
    
    queryClient.setQueryData(['admin-collections'], newOrder);
    
    const updates = newOrder.map((col, index) => ({
      id: col.id,
      display_order: index,
    }));
    
    reorderMutation.mutate(updates);
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
      <header className="bg-background border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link to="/admin" className="flex items-center text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-primary">Collection Management</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold">Collections ({collections?.length || 0})</h2>
            <p className="text-sm text-muted-foreground">Group products together for easy management</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Collection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-4">
              <DialogHeader>
                <DialogTitle>
                  {editingCollection ? 'Edit Collection' : 'Create New Collection'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Collection Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Summer Sale, New Arrivals"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this collection"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="image">Collection Image (Optional)</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, image: e.target.files?.[0] || null })}
                  />
                  {editingCollection?.image_url && !formData.image && (
                    <p className="text-xs text-muted-foreground mt-1">Current image will be kept if no new image is selected</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1"
                  >
                    {editingCollection ? 'Update' : 'Create'} Collection
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

        {collections && collections.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={collections.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {collections.map((collection) => (
                  <SortableCollectionItem
                    key={collection.id}
                    collection={collection}
                    onEdit={openEditDialog}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold mb-2">No collections yet</h3>
              <p className="text-muted-foreground mb-4">Create a collection to group related products together</p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Collection
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminCollections;
