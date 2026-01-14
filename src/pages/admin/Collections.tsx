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
import { ArrowLeft, Plus, Edit, Trash2, GripVertical, Layers, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

interface Collection {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  image_url: string | null;
}

interface SortableCollectionProps {
  collection: Collection;
  onEdit: (collection: Collection) => void;
  onDelete: (id: string) => void;
  productCount: number;
}

const SortableCollection = ({ collection, onEdit, onDelete, productCount }: SortableCollectionProps) => {
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
    <Card ref={setNodeRef} style={style} className="mb-2">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
            {collection.image_url ? (
              <img src={collection.image_url} alt={collection.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary flex-shrink-0" />
              <h3 className="font-semibold truncate">{collection.name}</h3>
            </div>
            {collection.description && (
              <p className="text-sm text-muted-foreground truncate">{collection.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{productCount} products</p>
          </div>
          
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => onEdit(collection)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(collection.id)}>
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
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Collection[];
    },
  });

  const { data: productCounts } = useQuery({
    queryKey: ['collection-product-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('collection_id');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(p => {
        if (p.collection_id) {
          counts[p.collection_id] = (counts[p.collection_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string | null; image_url: string | null }) => {
      const { error } = await supabase.from('collections').insert([{
        ...data,
        display_order: (collections?.length || 0) + 1,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
      toast({ title: "Collection created successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error creating collection", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; description: string | null; image_url?: string | null }) => {
      const { error } = await supabase
        .from('collections')
        .update(data)
        .eq('id', editingCollection!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
      toast({ title: "Collection updated successfully" });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error updating collection", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First, remove collection_id from products in this collection
      await supabase.from('products').update({ collection_id: null }).eq('collection_id', id);
      
      const { error } = await supabase.from('collections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({ title: "Collection deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error deleting collection", description: error.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase.from('collections').update({ display_order: index }).eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let image_url: string | null = editingCollection?.image_url || null;
    
    if (formData.image) {
      const fileExt = formData.image.name.split('.').pop();
      const fileName = `collection-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, formData.image);
      
      if (uploadError) {
        toast({ title: "Error uploading image", description: uploadError.message, variant: "destructive" });
        return;
      }
      
      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      image_url = data.publicUrl;
    }

    const data = {
      name: formData.name,
      description: formData.description || null,
      image_url,
    };

    if (editingCollection) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && collections) {
      const oldIndex = collections.findIndex(c => c.id === active.id);
      const newIndex = collections.findIndex(c => c.id === over.id);
      
      const newOrder = arrayMove(collections, oldIndex, newIndex);
      queryClient.setQueryData(['admin-collections'], newOrder);
      reorderMutation.mutate(newOrder.map(c => c.id));
    }
  };

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
            <h1 className="text-xl sm:text-2xl font-bold text-primary">Collection Management</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold">Collections ({collections?.length || 0})</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Collection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle>{editingCollection ? 'Edit Collection' : 'Create New Collection'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Collection Name</Label>
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

                <div>
                  <Label htmlFor="image">Collection Image</Label>
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
                
                <div className="flex flex-col sm:flex-row gap-2">
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

        <p className="text-sm text-muted-foreground mb-4">
          Drag and drop collections to reorder them. Collections group related products together.
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={collections?.map(c => c.id) || []} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {collections?.map((collection) => (
                <SortableCollection
                  key={collection.id}
                  collection={collection}
                  onEdit={openEditDialog}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  productCount={productCounts?.[collection.id] || 0}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {collections?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No collections yet. Create your first collection to group products together.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminCollections;
