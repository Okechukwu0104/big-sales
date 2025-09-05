import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StoreConfig } from '@/types';

export const useCurrency = () => {
  const { data: storeConfig } = useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_config')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as StoreConfig;
    },
  });

  const formatPrice = (price: number) => {
    const symbol = storeConfig?.currency_symbol || '₦';
    return `${symbol}${price.toFixed(2)}`;
  };

  return {
    currencySymbol: storeConfig?.currency_symbol || '₦',
    currencyCode: storeConfig?.currency_code || 'NGN',
    selectedCountry: storeConfig?.selected_country || 'Nigeria',
    formatPrice,
  };
};