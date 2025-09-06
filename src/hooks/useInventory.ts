import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/types';

export const useInventory = () => {
  const queryClient = useQueryClient();

  const updateInventoryMutation = useMutation({
    mutationFn: async (cartItems: CartItem[]) => {
      // Update inventory for each item in the cart
      for (const item of cartItems) {
        const { data: product } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', item.product.id)
          .single();
        
        if (product) {
          const newQuantity = Math.max(0, product.quantity - item.quantity);
          
          await supabase
            .from('products')
            .update({ quantity: newQuantity })
            .eq('id', item.product.id);
        }
      }
    },
    onSuccess: () => {
      // Invalidate products queries to refresh inventory
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  return {
    updateInventory: updateInventoryMutation.mutate,
    isUpdating: updateInventoryMutation.isPending,
  };
};