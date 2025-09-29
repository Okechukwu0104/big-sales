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

  // Generate social media links from stored data - FIXED VERSION
  const generateWhatsAppLink = () => {
    // Check both possible field names for backward compatibility
    const whatsappNumber = storeConfig?.whatsapp_number || extractPhoneFromLink(storeConfig?.whatsapp_link);
    
    if (!whatsappNumber) {
      console.log('No WhatsApp number found');
      return null;
    }
    
    const cleaned = whatsappNumber.replace(/[^\d+]/g, '');
    const phoneNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    const encodedMessage = encodeURIComponent('Hello, I have a question about your store');
    
    const link = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
    console.log('Generated WhatsApp link:', link);
    return link;
  };

  const generateInstagramLink = () => {
    // Check both possible field names
    const instagramUsername = storeConfig?.instagram_username || extractUsernameFromLink(storeConfig?.instagram_link, 'instagram');
    
    if (!instagramUsername) {
      console.log('No Instagram username found');
      return null;
    }
    
    const username = instagramUsername.replace(/@/g, '').trim();
    const link = `https://www.instagram.com/${username}/`;
    console.log('Generated Instagram link:', link);
    return link;
  };

  const generateFacebookLink = () => {
    // Check both possible field names
    const facebookUsername = storeConfig?.facebook_username || extractUsernameFromLink(storeConfig?.facebook_link, 'facebook');
    
    if (!facebookUsername) {
      console.log('No Facebook username found');
      return null;
    }
    
    const username = facebookUsername.replace(/@/g, '').trim();
    const link = `https://www.facebook.com/${username}/`;
    console.log('Generated Facebook link:', link);
    return link;
  };

  // Helper function to extract phone number from WhatsApp link
  const extractPhoneFromLink = (link: string | null) => {
    if (!link) return null;
    
    // Extract phone from wa.me links
    const waMeMatch = link.match(/wa\.me\/([0-9+]+)/);
    if (waMeMatch) return waMeMatch[1];
    
    // Extract phone from api.whatsapp.com links
    const apiMatch = link.match(/api\.whatsapp\.com\/send\?phone=([0-9+]+)/);
    if (apiMatch) return apiMatch[1];
    
    return link; // Return as-is if no pattern matches
  };

  // Helper function to extract username from social media links
  const extractUsernameFromLink = (link: string | null, platform: string) => {
    if (!link) return null;
    
    if (platform === 'instagram') {
      const instaMatch = link.match(/instagram\.com\/([^/?]+)/);
      return instaMatch ? instaMatch[1] : link;
    }
    
    if (platform === 'facebook') {
      const fbMatch = link.match(/facebook\.com\/([^/?]+)/);
      return fbMatch ? fbMatch[1] : link;
    }
    
    return link;
  };

  const whatsappLink = generateWhatsAppLink();
  const instagramLink = generateInstagramLink();
  const facebookLink = generateFacebookLink();

  // Debug: Check what links are being generated
  console.log('Social media links:', {
    whatsappLink,
    instagramLink,
    facebookLink,
    storeConfig
  });

  // Social media button component
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
      return (
        <button
          disabled
          aria-label={`${label} (unavailable)`}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-30 text-muted-foreground h-9 w-9"
        >
          <Icon className="h-5 w-5" />
        </button>
      );
    }

    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        aria-label={label}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-9 w-9 transition-all duration-200 active:scale-95 cursor-pointer"
        onClick={(e) => {
          console.log(`Opening ${label}:`, href);
          // Let the default anchor behavior handle the navigation
        }}
      >
        <Icon className="h-5 w-5" />
      </a>
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
            {/* Social Media Links */}
            <div className="flex items-center space-x-2">
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