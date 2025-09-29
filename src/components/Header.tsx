import { ShoppingCart, MessageCircle, Instagram, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartContext } from '@/components/ui/cart-provider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StoreConfig } from '@/types';
import { Link } from 'react-router-dom';

export const Header = () => {
  const { getTotalItems } = useCartContext();
  
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

  const totalItems = getTotalItems();

  // Generate social media links from stored data
  const generateWhatsAppLink = () => {
    if (!storeConfig?.whatsapp_number) return null;
    
    const cleaned = storeConfig.whatsapp_number.replace(/[^\d+]/g, '');
    const phoneNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    const encodedMessage = encodeURIComponent(storeConfig.whatsapp_message || 'Hello, I have a question about your store');
    
    return `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
  };

  const generateInstagramLink = () => {
    if (!storeConfig?.instagram_username) return null;
    const username = storeConfig.instagram_username.replace(/@/g, '').trim();
    return `https://www.instagram.com/${username}/`;
  };

  const generateFacebookLink = () => {
    if (!storeConfig?.facebook_username) return null;
    const username = storeConfig.facebook_username.replace(/@/g, '').trim();
    return `https://www.facebook.com/${username}/`;
  };

  const whatsappLink = generateWhatsAppLink();
  const instagramLink = generateInstagramLink();
  const facebookLink = generateFacebookLink();

  return ( 
    <header className="bg-background border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="/images/big-sales-logo.png" 
              alt="BIG SALES"
              className="h-11 w-auto"
              loading="eager"
              decoding="async"
            />
          </Link>
          
          <div className="flex items-center space-x-4">
            {/* Social Media Links */}
            <div className="flex items-center space-x-2">
              {whatsappLink && (
                <Button variant="ghost" size="sm" asChild>
                  <a 
                    href={whatsappLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Contact us on WhatsApp"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </a>
                </Button>
              )}
              {instagramLink && (
                <Button variant="ghost" size="sm" asChild>
                  <a 
                    href={instagramLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Follow us on Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                </Button>
              )}
              {facebookLink && (
                <Button variant="ghost" size="sm" asChild>
                  <a 
                    href={facebookLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Follow us on Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                </Button>
              )}
            </div>

            {/* Cart Button */}
            <Button variant="outline" size="sm" asChild>
              <Link to="/cart" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs">
                    {totalItems}
                  </Badge>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};