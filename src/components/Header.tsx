import { ShoppingCart, Instagram, Facebook, Search, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartContext } from '@/components/ui/cart-provider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StoreConfig } from '@/types';
import { Link } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';

export const Header = () => {
  const { getTotalItems } = useCartContext();
  const { toast } = useToast();
  
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
    // Changed message to position WhatsApp as support, not sales
    const encodedMessage = encodeURIComponent('Hi, I need help with my order');
    
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

  // WhatsApp button repositioned as support/help
  const HelpButton = () => {
    if (!whatsappLinks) return null;

    const handleWhatsAppClick = () => {
    if (!storeConfig?.whatsapp_number) {
      toast({
        title: "WhatsApp not configured",
        description: "Please contact the store owner directly.",
        variant: "destructive"
      });
      return;
    }

    const cleaned = storeConfig.whatsapp_number.replace(/[^\d+]/g, '');
    const phoneNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;


    const message = 
      `Hello, I need support with my order`

    const deepLink = `whatsapp://send?phone=${phoneNumber.replace('+', '')}&text=${message}`;
    const webLink = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;

    const fallbackTimer = setTimeout(() => {
      window.open(webLink, '_blank');
    }, 1000);

    const link = document.createElement('a');
    link.href = deepLink;
    link.target = '_blank';
    
    link.addEventListener('click', () => {
      clearTimeout(fallbackTimer);
    });
    
    setTimeout(() => {
      clearTimeout(fallbackTimer);
    }, 500);
    
    link.click();
  };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleWhatsAppClick}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Need help? Contact support"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Need help?</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
    <header className="fixed top-0 left-0 right-0 w-full bg-background/95 backdrop-blur-md border-b border-border z-50">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <picture>
              <source srcSet="/images/big-sales-logo.webp" type="image/webp" />
              <img 
                src="/images/big-sales-logo.png" 
                alt="BIG SALES"
                className="h-9 sm:h-11 w-auto"
                width={120}
                height={44}
                loading="eager"
                decoding="async"
              />
            </picture>
          </Link>
          
          <div className="flex items-center space-x-2">
            {/* Social Media Links - subtle */}
            <div className="hidden sm:flex items-center space-x-1">
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

            {/* Cart Button - MOST PROMINENT */}
            <Button variant="default" size="sm" asChild className="relative">
              <Link to="/cart">
                <ShoppingCart className="h-4 w-4" />
                {totalItems > 0 && (
                  <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs bg-white text-primary border border-primary">
                    {totalItems}
                  </Badge>
                )}
              </Link>
            </Button>

            {/* Help/Support - moved to end and subtle */}
            <HelpButton />
          </div>
        </div>
      </div>
    </header>
  );
};