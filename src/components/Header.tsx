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
      
      if (error) {
        console.error('Error fetching store config:', error);
        throw error;
      }
      
      console.log('Store config in Header:', data);
      return data as StoreConfig;
    },
  });

  const totalItems = getTotalItems();

  // Generate social media links - SIMPLIFIED VERSION
  const generateWhatsAppLink = () => {
    if (!storeConfig?.whatsapp_number) {
      console.log('No WhatsApp number in store config');
      return null;
    }
    
    const cleaned = storeConfig.whatsapp_number.replace(/[^\d+]/g, '');
    const phoneNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    const encodedMessage = encodeURIComponent('Hello, I have a question about your store');
    
    const link = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
    console.log('WhatsApp link generated:', link);
    return link;
  };

  const generateInstagramLink = () => {
    // Use the exact field name that exists in your database
    if (!storeConfig?.instagram_username) {
      console.log('No Instagram username in store config');
      return null;
    }
    
    const username = storeConfig.instagram_username.replace(/@/g, '').trim();
    const link = `https://www.instagram.com/${username}/`;
    console.log('Instagram link generated:', link);
    return link;
  };

  const generateFacebookLink = () => {
    // Use the exact field name that exists in your database
    if (!storeConfig?.facebook_username) {
      console.log('No Facebook username in store config');
      return null;
    }
    
    const username = storeConfig.facebook_username.replace(/@/g, '').trim();
    const link = `https://www.facebook.com/${username}/`;
    console.log('Facebook link generated:', link);
    return link;
  };

  const whatsappLink = generateWhatsAppLink();
  const instagramLink = generateInstagramLink();
  const facebookLink = generateFacebookLink();

  // Debug: Log what we found
  console.log('Header social links:', {
    hasWhatsApp: !!storeConfig?.whatsapp_number,
    hasInstagram: !!storeConfig?.instagram_username,
    hasFacebook: !!storeConfig?.facebook_username,
    whatsappLink,
    instagramLink,
    facebookLink
  });

  // Simple social button component
  const SocialButton = ({ 
    href, 
    icon: Icon, 
    label,
  }: { 
    href: string | null; 
    icon: React.ElementType; 
    label: string;
  }) => {
    if (!href) {
      return null; // Don't show button if no link
    }

    return (
      <Button
        variant="ghost"
        size="sm"
        asChild
      >
        <a 
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="h-9 w-9 p-0"
          onClick={() => console.log(`Clicked ${label}:`, href)}
        >
          <Icon className="h-4 w-4" />
        </a>
      </Button>
    );
  };

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
            {/* Social Media Links - Only show if we have links */}
            {(whatsappLink || instagramLink || facebookLink) && (
              <div className="flex items-center space-x-1">
                <SocialButton 
                  href={whatsappLink}
                  icon={MessageCircle}
                  label="Contact us on WhatsApp"
                />
                <SocialButton 
                  href={instagramLink}
                  icon={Instagram}
                  label="Follow us on Instagram"
                />
                <SocialButton 
                  href={facebookLink}
                  icon={Facebook}
                  label="Follow us on Facebook"
                />
              </div>
            )}

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