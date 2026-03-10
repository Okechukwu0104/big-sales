import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, StoreConfig } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { Header } from '@/components/Header';
import { TrustBadges } from '@/components/TrustBadges';
import { TestimonialCarousel } from '@/components/TestimonialCarousel';
import { FAQ } from '@/components/FAQ';
import { ProductSection } from '@/components/ProductSection';
import { CategoryBrowser } from '@/components/CategoryBrowser';
import { PromoBannerCarousel } from '@/components/PromoBannerCarousel';
import { ContactUsPopup } from '@/components/ContactUsPopup';
import { SocialProofStats } from '@/components/SocialProofStats';
import { HowItWorks } from '@/components/HowItWorks';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, Sparkles, ArrowUp, HelpCircle, 
  Clock, Flame, Star, ArrowLeft, MessageCircle, Package, Eye, Keyboard
} from 'lucide-react';
import { InstantSearchDropdown } from '@/components/InstantSearchDropdown';
import { useToast } from '@/hooks/use-toast';

const Home = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { recentlyViewedIds } = useRecentlyViewed();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [viewMode, setViewMode] = useState<'home' | 'all'>('home');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  
  const faqSectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mobileFiltersRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const searchPlaceholders = [
    "Search for Air Fryer...",
    "Search for Blender...",
    "Search for Kitchen Set...",
    "Search for Power Bank...",
    "Search for Smart Watch...",
    "Search for Perfume...",
  ];

  // Rotate placeholder text
  useEffect(() => {
    if (isSearchFocused || searchTerm) return;
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % searchPlaceholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isSearchFocused, searchTerm, searchPlaceholders.length]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all products
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch store config for WhatsApp
  const { data: storeConfig } = useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_config')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      return data as StoreConfig | null;
    },
  });

  // Fetch orders for best sellers calculation (only admins can read, so handle gracefully)
  const { data: orders } = useQuery({
    queryKey: ['orders-for-bestsellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('order_items');
      
      // If error (likely RLS), return empty array
      if (error) return [];
      return data || [];
    },
  });

  // Calculate best sellers from orders
  const bestSellers = useMemo(() => {
    if (!products || !orders || orders.length === 0) return [];
    
    const purchaseCounts: Record<string, number> = {};
    
    orders.forEach((order) => {
      const items = order.order_items as any[];
      if (Array.isArray(items)) {
        items.forEach((item) => {
          if (item?.id) {
            purchaseCounts[item.id] = (purchaseCounts[item.id] || 0) + (item.quantity || 1);
          }
        });
      }
    });
    
    const topProductIds = Object.entries(purchaseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => id);
    
    return topProductIds
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => p !== undefined);
  }, [products, orders]);

  // New arrivals (most recent 8 products)
  const newArrivals = useMemo(() => {
    if (!products) return [];
    return products.slice(0, 8);
  }, [products]);

  // Featured products
  const featuredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => p.featured).slice(0, 8);
  }, [products]);

  // Recently viewed products
  const recentlyViewedProducts = useMemo(() => {
    if (!products || recentlyViewedIds.length === 0) return [];
    return recentlyViewedIds
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => p !== undefined)
      .slice(0, 8);
  }, [products, recentlyViewedIds]);

  // Extract unique categories for filtering
  const categories = useMemo(() => {
    if (!products) return ['All'];
    const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(uniqueCategories).sort()];
  }, [products]);

  // Filter products based on search term and category
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let filtered = products;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name?.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [products, searchTerm, selectedCategory]);

  // WhatsApp request function
  const requestProductViaWhatsApp = () => {
    if (!storeConfig?.whatsapp_number) {
      toast({
        title: "WhatsApp not configured",
        description: "Please contact the store owner directly.",
        variant: "destructive"
      });
      return;
    }

    const phoneNumber = storeConfig.whatsapp_number.replace(/[^0-9+]/g, '');
    const message = encodeURIComponent(`Hi! I'm looking for: ${searchTerm}\n\nCould you help me find this product?`);
    const deepLink = `whatsapp://send?phone=${phoneNumber}&text=${message}`;
    const webLink = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;

    // Try deep link first, fallback to web link
    const link = document.createElement('a');
    link.href = deepLink;
    link.click();

    // Fallback after a short delay
    setTimeout(() => {
      window.open(webLink, '_blank');
    }, 500);
  };

  // Scroll to FAQ section
  const scrollToFAQ = () => {
    if (faqSectionRef.current) {
      faqSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Handle see all products
  const handleSeeAll = () => {
    setViewMode('all');
    setSelectedCategory('All');
    setSearchTerm('');
    scrollToTop();
  };

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setViewMode('all');
    scrollToTop();
  };

  // Show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showMobileFilters &&
        mobileFiltersRef.current &&
        !mobileFiltersRef.current.contains(event.target as Node)
      ) {
        setShowMobileFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileFilters]);

  // Check if search has no results
  const hasNoSearchResults = searchTerm.trim() && filteredProducts.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <Header />

      <main className="pt-20">
        {/* Promotional Banner Carousel */}
        <PromoBannerCarousel />

        {/* Hero Section — Search-First */}
        <section className="relative overflow-hidden bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/bg-pattern.avif')" }}>
          <div className="absolute inset-0 bg-gradient-to-br from-orange-900/30 to-amber-900/15 backdrop-blur-[1px]"></div>

          <div className="container mx-auto px-4 py-10 md:py-16 relative">
            <div className="max-w-3xl mx-auto text-center">
              {viewMode === 'all' && (
                <button
                  onClick={() => {
                    setViewMode('home');
                    setSearchTerm('');
                    setSelectedCategory('All');
                    setShowSearchDropdown(false);
                  }}
                  className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-4 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </button>
              )}

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent drop-shadow-sm">
                BIG SALES
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 leading-relaxed max-w-xl mx-auto">
                🔍 What are you looking for today?
              </p>

              {/* Search Bar — The Hero */}
              <div className="max-w-2xl mx-auto mb-4" ref={searchContainerRef}>
                <div className={`relative transition-all duration-300 ${isSearchFocused ? 'scale-[1.02]' : ''}`}>
                  {/* Animated glow ring */}
                  <div className={`absolute -inset-[3px] rounded-[20px] bg-gradient-to-r from-orange-400 via-amber-400 to-orange-400 bg-[length:200%_100%] transition-opacity duration-300 ${isSearchFocused ? 'opacity-100 animate-[shimmer_2s_ease-in-out_infinite]' : 'opacity-40 animate-[shimmer_3s_ease-in-out_infinite]'}`} />
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Search className={`h-6 w-6 transition-colors ${isSearchFocused ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <input
                      type="text"
                      placeholder={searchPlaceholders[placeholderIndex]}
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setShowSearchDropdown(true);
                      }}
                      onFocus={() => {
                        setIsSearchFocused(true);
                        if (searchTerm.trim()) setShowSearchDropdown(true);
                      }}
                      onBlur={() => setIsSearchFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowSearchDropdown(false);
                          (e.target as HTMLInputElement).blur();
                        }
                        if (e.key === 'Enter' && searchTerm.trim()) {
                          setShowSearchDropdown(false);
                          setViewMode('all');
                        }
                      }}
                      className="w-full pl-14 pr-14 py-5 md:py-6 rounded-2xl focus:outline-none bg-card text-foreground text-lg shadow-2xl border-0 placeholder:text-muted-foreground/60"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setShowSearchDropdown(false);
                          if (viewMode === 'all' && selectedCategory === 'All') {
                            setViewMode('home');
                          }
                        }}
                        className="absolute inset-y-0 right-0 pr-5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Instant Search Dropdown */}
                  {showSearchDropdown && searchTerm.trim() && (
                    <InstantSearchDropdown
                      searchTerm={searchTerm}
                      products={filteredProducts}
                      isLoading={isLoadingProducts}
                      onClose={() => setShowSearchDropdown(false)}
                      onRequestWhatsApp={requestProductViaWhatsApp}
                    />
                  )}
                </div>
              </div>

              {/* Hint text */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <Keyboard className="h-3.5 w-3.5 text-white/50" />
                <span className="text-xs sm:text-sm text-white/60">Type to find any product instantly</span>
              </div>
              
              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-border shadow-sm">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium text-foreground">100% Original</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-border shadow-sm">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium text-foreground">Nationwide Delivery</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-border shadow-sm">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium text-foreground">Pay on Delivery</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Container */}
        <div className="container mx-auto px-4">
          {viewMode === 'home' ? (
            <>
              {/* New Arrivals Section */}
              <ProductSection
                title="New Arrivals"
                icon={<Clock className="h-5 w-5" />}
                products={newArrivals}
                isLoading={isLoadingProducts}
                onSeeAll={handleSeeAll}
              />

              {/* Best Sellers Section */}
              {bestSellers.length > 0 && (
                <ProductSection
                  title="Best Sellers"
                  icon={<Flame className="h-5 w-5" />}
                  products={bestSellers}
                  onSeeAll={handleSeeAll}
                />
              )}

              {/* Featured Products Section */}
              {featuredProducts.length > 0 && (
                <ProductSection
                  title="Featured Products"
                  icon={<Star className="h-5 w-5" />}
                  products={featuredProducts}
                  onSeeAll={handleSeeAll}
                />
              )}

              {/* Recently Viewed Products Section */}
              {recentlyViewedProducts.length > 0 && (
                <ProductSection
                  title="Recently Viewed"
                  icon={<Eye className="h-5 w-5" />}
                  products={recentlyViewedProducts}
                  onSeeAll={handleSeeAll}
                />
              )}

              {/* Category Browser */}
              <CategoryBrowser
                onCategorySelect={handleCategorySelect}
                selectedCategory={selectedCategory}
              />
            </>
          ) : (
            /* All Products View */
            <section className="py-8">
              {/* Results Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl text-orange-600">
                      <Package className="h-5 w-5" />
                    </div>
                    {selectedCategory !== 'All' ? selectedCategory : 'All Products'}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
                    {searchTerm && ` for "${searchTerm}"`}
                  </p>
                </div>
                
                {(searchTerm || selectedCategory !== 'All') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('All');
                    }}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Clear filters
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-6">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border ${
                      selectedCategory === category
                        ? 'bg-orange-600 text-white border-orange-600 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Products Grid */}
              {isLoadingProducts ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-white rounded-2xl p-4 border border-gray-200">
                      <div className="bg-gray-200 aspect-square rounded-xl mb-4"></div>
                      <div className="bg-gray-200 h-4 rounded mb-2"></div>
                      <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
                      <div className="bg-gray-200 h-6 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                /* No Results - WhatsApp Fallback */
                <div className="text-center py-16">
                  <div className="bg-white p-8 rounded-2xl max-w-md mx-auto border border-gray-200 shadow-sm">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Product not found
                    </h3>
                    <p className="text-gray-600 mb-6">
                      We couldn't find "{searchTerm}" in our catalog. Would you like to request this product?
                    </p>
                    
                    {/* WhatsApp Request Button */}
                    <button
                      onClick={requestProductViaWhatsApp}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-md hover:shadow-lg mb-4"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span className="font-medium">Request via WhatsApp</span>
                    </button>

                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('All');
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Or browse all products
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Social Proof Stats */}
        <SocialProofStats />

        {/* Trust Badges Section */}
        <TrustBadges />

        {/* How It Works */}
        <HowItWorks />

        {/* Customer Testimonials */}
        <TestimonialCarousel />

        {/* Proudly Nigerian */}
        <div className="py-6 text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full border border-accent/20">
            <div className="flag-stripe w-6 rounded-sm" />
            <span className="text-sm font-semibold text-accent">Proudly Nigerian 🇳🇬</span>
          </div>
        </div>

        {/* FAQ Section */}
        <div ref={faqSectionRef}>
          <FAQ />
        </div>

        {/* Scroll to Top Button */}
        <button
          onClick={scrollToTop}
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 p-3 bg-orange-600 text-white rounded-full shadow-lg hover:bg-orange-700 transition-all duration-300 hover:scale-110 ${
            showScrollTop
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-10 pointer-events-none'
          }`}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-6 w-6" />
        </button>

        {/* Floating FAQ Button */}
        <button
          onClick={scrollToFAQ}
          className={`fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 p-3 bg-white text-gray-700 rounded-full shadow-lg hover:bg-gray-50 transition-all duration-300 hover:scale-110 border border-gray-200 ${
            showScrollTop 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-10 pointer-events-none'
          }`}
          aria-label="Go to FAQ section"
        >
          <HelpCircle className="h-6 w-6 text-orange-600" />
        </button>

        {/* Contact Us Popup (WhatsApp) */}
        <ContactUsPopup />
      </main>
    </div>
  );
};

export default Home;