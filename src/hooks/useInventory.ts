// hooks/useInventory.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CartItem } from '@/types';

export const useInventory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateInventoryMutation = useMutation({
    mutationFn: async (cartItems: CartItem[]) => {
      // Update inventory for each item in the cart
      for (const item of cartItems) {
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', item.product.id)
          .single();
        
        if (fetchError) throw fetchError;
        
        if (product) {
          const newQuantity = Math.max(0, product.quantity - item.quantity);
          const in_stock = newQuantity > 0;
          
          const { error: updateError } = await supabase
            .from('products')
            .update({ 
              quantity: newQuantity,
              in_stock: in_stock
            })
            .eq('id', item.product.id);
          
          if (updateError) throw updateError;
        }
      }
    },
    onSuccess: () => {
      // Invalidate products queries to refresh inventory
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (error) => {
      toast({
        title: "Inventory update failed",
        description: "There was an error updating product quantities.",
        variant: "destructive",
      });
      console.error('Inventory update error:', error);
    },
  });

  return {
    updateInventory: updateInventoryMutation.mutate,
    isUpdating: updateInventoryMutation.isPending,
  };
};