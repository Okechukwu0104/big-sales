import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProductTag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Tag, Palette } from 'lucide-react';

const colorPresets = [
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

const AdminTags = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ProductTag | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
  });

  // Fetch tags with product counts
  const { data: tags, isLoading } = useQuery({
    queryKey: ['admin-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_tags')
        .select(`
          *,
          product_tag_assignments (count)
        `)
        .order('name');
      
      if (error) throw error;
      return data as (ProductTag & { product_tag_assignments: { count: number }[] })[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('product_tags')
        .insert({
          name: formData.name.trim(),
          color: formData.color,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      toast({ title: 'Tag created successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast({ title: 'A tag with this name already exists', variant: 'destructive' });
      } else {
        toast({ title: 'Failed to create tag', variant: 'destructive' });
      }
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingTag) return;

      const { error } = await supabase
        .from('product_tags')
        .update({
          name: formData.name.trim(),
          color: formData.color,
        })
        .eq('id', editingTag.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      toast({ title: 'Tag updated successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast({ title: 'A tag with this name already exists', variant: 'destructive' });
      } else {
        toast({ title: 'Failed to update tag', variant: 'destructive' });
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_tags')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tags'] });
      toast({ title: 'Tag deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete tag', variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', color: '#3b82f6' });
    setEditingTag(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (tag: ProductTag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color || '#3b82f6',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: 'Please enter a tag name', variant: 'destructive' });
      return;
    }
    
    if (editingTag) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

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
              <h1 className="text-2xl font-bold">Tags Management</h1>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tag
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground mb-6">
          Use tags to highlight products with labels like "New", "Trending", "Sale", etc.
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tags && tags.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tags.map(tag => {
              const productCount = tag.product_tag_assignments?.[0]?.count || 0;
              return (
                <Card key={tag.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: tag.color || '#3b82f6' }}
                        >
                          <Tag className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <Badge 
                            className="text-white border-0"
                            style={{ backgroundColor: tag.color || '#3b82f6' }}
                          >
                            {tag.name}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {productCount} product{productCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditDialog(tag)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this tag?')) {
                              deleteMutation.mutate(tag.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tags yet</h3>
              <p className="text-muted-foreground mb-4">
                Create tags to label and highlight your products.
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Tag
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTag ? 'Edit Tag' : 'Create Tag'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <Label>Tag Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., New, Trending, Sale"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Tag Color
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {colorPresets.map(color => (
                    <button
                      key={color}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        formData.color === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label>Preview</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <Badge 
                    className="text-white border-0"
                    style={{ backgroundColor: formData.color }}
                  >
                    {formData.name || 'Tag Name'}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 
                   editingTag ? 'Update Tag' : 'Create Tag'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminTags;
