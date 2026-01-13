import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { WishlistItem, Product } from '@/types';
import { useCallback } from 'react';

export const useWishlist = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch wishlist items
  const { data: wishlistItems, isLoading } = useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          *,
          product:products (*)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as (WishlistItem & { product: Product })[];
    },
    enabled: !!user,
  });

  // Check if a product is in wishlist
  const isInWishlist = useCallback((productId: string) => {
    return wishlistItems?.some(item => item.product_id === productId) ?? false;
  }, [wishlistItems]);

  // Add to wishlist mutation
  const addMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('wishlists')
        .insert({
          user_id: user.id,
          product_id: productId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast({ title: 'Added to wishlist' });
    },
    onError: () => {
      toast({ title: 'Failed to add to wishlist', variant: 'destructive' });
    },
  });

  // Remove from wishlist mutation
  const removeMutation = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast({ title: 'Removed from wishlist' });
    },
    onError: () => {
      toast({ title: 'Failed to remove from wishlist', variant: 'destructive' });
    },
  });

  // Toggle wishlist status
  const toggleWishlist = useCallback((productId: string) => {
    if (!user) {
      toast({ 
        title: 'Please sign in', 
        description: 'You need to be logged in to save items to your wishlist',
        variant: 'destructive' 
      });
      return;
    }

    if (isInWishlist(productId)) {
      removeMutation.mutate(productId);
    } else {
      addMutation.mutate(productId);
    }
  }, [user, isInWishlist, addMutation, removeMutation, toast]);

  return {
    wishlistItems: wishlistItems || [],
    isLoading,
    isInWishlist,
    toggleWishlist,
    addToWishlist: addMutation.mutate,
    removeFromWishlist: removeMutation.mutate,
    isUpdating: addMutation.isPending || removeMutation.isPending,
  };
};

export default useWishlist;
