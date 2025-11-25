import { ShoppingCart, MessageCircle, Instagram, Facebook, Search } from 'lucide-react';
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

  // Generate WhatsApp links - both deep link and web link
  const generateWhatsAppLinks = () => {
    if (!storeConfig?.whatsapp_number) return null;
    
    const cleaned = storeConfig.whatsapp_number.replace(/[^\d+]/g, '');
    const phoneNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    const encodedMessage = encodeURIComponent(storeConfig.whatsapp_message || 'Hello, I have a question about your store');
    
    // Deep link for mobile apps
    const deepLink = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;
    
    // Web link for desktop
    const webLink = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
    
    // API link as fallback
    const apiLink = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
    
    return { deepLink, webLink, apiLink };
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

  const whatsappLinks = generateWhatsAppLinks();
  const instagramLink = generateInstagramLink();
  const facebookLink = generateFacebookLink();

  // WhatsApp button with dual linking
  const WhatsAppButton = () => {
    if (!whatsappLinks) return null;

    const handleWhatsAppClick = () => {
      // Check if user is on mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Try deep link first for mobile
        window.location.href = whatsappLinks.deepLink;
        
        // Fallback to API link if deep link fails
        setTimeout(() => {
          if (!document.hidden) {
            window.open(whatsappLinks.apiLink, '_blank');
          }
        }, 2000);
      } else {
        // For desktop, try web WhatsApp first
        window.open(whatsappLinks.webLink, '_blank');
        
        // Fallback to API link if web version fails
        setTimeout(() => {
          if (window.closed === false) {
            window.open(whatsappLinks.apiLink, '_blank');
          }
        }, 1000);
      }
    };

    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleWhatsAppClick}
        className="h-9 w-9 p-0"
        aria-label="Contact us on WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    );
  };

  // Social media button component for other platforms
  const SocialButton = ({ 
    href, 
    icon: Icon, 
    label,
  }: { 
    href: string | null; 
    icon: React.ElementType; 
    label: string;
  }) => {
    if (!href) return null;

    return (
      <Button 
        variant="outline" 
        size="sm" 
        asChild
        className="h-9 w-9 p-0"
      >
        <a 
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </a>
      </Button>
    );
  };

  return ( 
    <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border z-50">
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
          
          <div className="flex items-center space-x-2">
            {/* Social Media Links */}
            <div className="flex items-center space-x-2">
              <WhatsAppButton />
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

            {/* Track Order Button */}
            <Button variant="outline" size="sm" asChild>
              <Link to="/track-order">
                <Search className="h-4 w-4" />
              </Link>
            </Button>

            {/* Cart Button */}
            <Button variant="outline" size="sm" asChild>
              <Link to="/cart" className="relative">
                <ShoppingCart className="h-4 w-4" />
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