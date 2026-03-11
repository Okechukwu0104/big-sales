import { ShoppingCart, Instagram, Facebook, Search, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartContext } from '@/components/ui/cart-provider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StoreConfig } from '@/types';
import { Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Header = () => {
  const { getTotalItems } = useCartContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // Generate WhatsApp links
  const generateWhatsAppLinks = () => {
    if (!storeConfig?.whatsapp_number) return null;
    const cleaned = storeConfig.whatsapp_number.replace(/[^\d+]/g, '');
    const phoneNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    const encodedMessage = encodeURIComponent('Hi, I need help with my order');
    const deepLink = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;
    const webLink = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
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
      const message = `Hello, I need support with my order`;
      const deepLink = `whatsapp://send?phone=${phoneNumber.replace('+', '')}&text=${message}`;
      const webLink = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;

      const fallbackTimer = setTimeout(() => {
        window.open(webLink, '_blank');
      }, 1000);

      const link = document.createElement('a');
      link.href = deepLink;
      link.target = '_blank';
      link.addEventListener('click', () => clearTimeout(fallbackTimer));
      setTimeout(() => clearTimeout(fallbackTimer), 500);
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
              className="h-9 w-9 p-0 text-muted-foreground hover:text-primary transition-colors"
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

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
      <Button variant="ghost" size="icon" asChild className="h-9 w-9 text-muted-foreground hover:text-foreground">
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
          <Icon className="h-4 w-4" />
        </a>
      </Button>
    );
  };

  return ( 
    <header className="fixed top-0 left-0 right-0 w-full z-50 shadow-md">
      {/* Nigerian flag stripe */}
      <div className="flag-stripe" />
      
      <div className="bg-background/97 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center">
              <picture>
                <source srcSet="/images/big-sales-logo.webp" type="image/webp" />
                <img 
                  src="/images/big-sales-logo.png" 
                  alt="BIG SALES"
                  className="h-8 sm:h-10 w-auto hover:opacity-90 transition-opacity"
                  width={120}
                  height={44}
                  loading="eager"
                  decoding="async"
                />
              </picture>
            </Link>

            {/* Search Bar - Hidden on small mobile, visible on sm and up */}
            <div className="hidden sm:flex flex-1 max-w-xl px-2">
              <form onSubmit={handleSearch} className="w-full relative group">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-muted border border-transparent focus:bg-background focus:border-primary/30 hover:bg-muted/80 rounded-full text-sm transition-all outline-none focus:ring-2 focus:ring-primary/10"
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <button type="submit" className="hidden">Search</button>
              </form>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className="hidden md:flex items-center gap-1 mr-1 border-r border-border pr-2">
                <SocialButton href={instagramLink} icon={Instagram} label="Follow us on Instagram" />
                <SocialButton href={facebookLink} icon={Facebook} label="Follow us on Facebook" />
              </div>

              <HelpButton />

              {/* Cart */}
              <Button
                size="sm"
                asChild
                className="relative h-9 px-3 sm:px-5 rounded-full font-bold gradient-button text-white ml-1 hover:-translate-y-0.5 transition-transform"
              >
                <Link to="/cart" className="flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Cart</span>
                  {totalItems > 0 && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center text-[10px] bg-secondary text-secondary-foreground border-2 border-background rounded-full p-0 font-bold"
                    >
                      {totalItems}
                    </Badge>
                  )}
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Mobile Search Bar */}
          <div className="sm:hidden mt-2.5 pb-1">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-full text-sm outline-none border border-transparent focus:border-primary/30 focus:bg-background"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </form>
          </div>
        </div>
      </div>
    </header>
  );
};
