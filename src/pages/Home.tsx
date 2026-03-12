import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, StoreConfig } from '@/types';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { useCurrency } from '@/hooks/useCurrency';
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
import { Footer } from '@/components/Footer';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, X, Sparkles, ArrowUp, HelpCircle, 
  Clock, Flame, Star, ArrowLeft, ArrowRight, MessageCircle, Package, Eye, Keyboard,
  SlidersHorizontal, ArrowDownWideNarrow, ArrowUpWideNarrow, Tag
} from 'lucide-react';
import { InstantSearchDropdown } from '@/components/InstantSearchDropdown';
import { useToast } from '@/hooks/use-toast';

type SortOption = 'newest' | 'price-low' | 'price-high' | 'name-asc' | 'name-desc';

const Home = () => {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { recentlyViewedIds } = useRecentlyViewed();
  
  // Initialize searchTerm from URL if present
  const initialSearch = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'home' | 'all'>(initialSearch ? 'all' : 'home');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  const faqSectionRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mobileFiltersRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Sync state with URL params
  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null && q !== searchTerm) {
      setSearchTerm(q);
      setViewMode('all');
    }
  }, [searchParams]);

  // Update URL when search cleared in 'all' view
  useEffect(() => {
    if (searchTerm === '' && searchParams.has('q')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('q');
      setSearchParams(newParams);
    }
  }, [searchTerm, searchParams, setSearchParams]);

  const searchPlaceholders = [
    "Search for Air Fryer...",
    "Search for Blender...",
    "Search for Kitchen Set...",
    "Search for Power Bank...",
    "Search for Smart Watch...",
    "Search for Perfume...",
  ];

  // Close sort dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
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

  // Top 3 trending products by likes
  const trendingProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return [...products]
      .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
      .slice(0, 3);
  }, [products]);

  // Embla carousel for trending hero
  const [heroEmblaRef, heroEmblaApi] = useEmblaCarousel(
    { loop: true, duration: 30 },
    [Autoplay({ delay: 4000, stopOnInteraction: false })]
  );
  const [heroActiveSlide, setHeroActiveSlide] = useState(0);

  useEffect(() => {
    if (!heroEmblaApi) return;
    const onSelect = () => setHeroActiveSlide(heroEmblaApi.selectedScrollSnap());
    heroEmblaApi.on('select', onSelect);
    onSelect();
    return () => { heroEmblaApi.off('select', onSelect); };
  }, [heroEmblaApi]);

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

  // Sort products based on selected sort option
  const sortedAndFilteredProducts = useMemo(() => {
    if (!filteredProducts) return [];

    const sorted = [...filteredProducts];

    switch (sortBy) {
      case 'newest':
        // Assuming created_at exists, otherwise fallback to name
        return sorted.sort((a, b) => {
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return 0;
        });
      case 'price-low':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price-high':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'name-asc':
        return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'name-desc':
        return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      default:
        return sorted;
    }
  }, [filteredProducts, sortBy]);

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
    setSortBy('newest');
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

  // Get sort button label
  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case 'newest': return 'Newest First';
      case 'price-low': return 'Price: Low to High';
      case 'price-high': return 'Price: High to Low';
      case 'name-asc': return 'Name: A to Z';
      case 'name-desc': return 'Name: Z to A';
      default: return 'Sort By';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20">
        {/* Promotional Banner Carousel */}
        <PromoBannerCarousel />

        {/* Hero Section — Bold, Dark, Pattern */}
        {viewMode === 'home' && (
          <section className="relative overflow-hidden pattern-bg pattern-overlay">
            {/* Dark gradient overlay on pattern */}
            <div className="absolute inset-0 gradient-dark opacity-85 z-0" />
            {/* Orange glow blob */}
            <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-25 z-0" style={{background: 'hsl(22 100% 52%)'}} />
            <div className="absolute -bottom-16 -left-16 w-[300px] h-[300px] rounded-full blur-3xl opacity-20 z-0" style={{background: 'hsl(35 100% 52%)'}} />

            <div className="container mx-auto px-4 py-10 sm:py-16 md:py-28 relative z-10">
              <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-10 md:gap-14">

                {/* Left: Text content */}
                <div className="w-full md:w-1/2 text-center md:text-left">
                  {/* Eyebrow badge */}
                  <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-4 sm:mb-6 border border-white/20 bg-white/10 backdrop-blur-sm text-white/90">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    <span className="text-[10px] sm:text-sm font-bold tracking-wider uppercase">Nigeria's #1 Online Store</span>
                  </div>

                  {/* Main headline */}
                  <h1 className="text-[2rem] sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.02] mb-4 sm:mb-5 text-white">
                    Shop Big.
                    <span className="block hero-text mt-1">Save Bigger.</span>
                  </h1>

                  <p className="text-sm sm:text-base md:text-lg text-white/70 mb-5 sm:mb-8 leading-relaxed max-w-md mx-auto md:mx-0">
                    Premium products. Unbeatable prices. Delivered to you across 20+ states. We also help you find the cheapest and most affordable products For FREE!
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-4 justify-center md:justify-start">
                    <button
                      onClick={handleSeeAll}
                      className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 gradient-button text-white rounded-full text-sm sm:text-base font-bold tracking-wide transition-all hover:-translate-y-1 hover:shadow-[0_8px_32px_hsl(22_100%_52%_/_0.5)] active:scale-95"
                    >
                      🛒 Shop Now
                    </button>
                    <button
                      onClick={() => {
                        document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm sm:text-base font-bold border border-white/25 hover:bg-white/20 transition-all active:scale-95"
                    >
                      Browse Categories
                    </button>
                  </div>

                  {/* Trust row */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-5 mt-6 sm:mt-10 justify-center md:justify-start">
                    {[
                      { icon: Package, label: 'Nationwide Delivery' },
                      { icon: Star, label: '100% Original' },
                      { icon: MessageCircle, label: 'WhatsApp Support' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-1.5 sm:gap-2 text-white/70 text-xs sm:text-sm font-medium">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/20 flex items-center justify-center">
                          <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                        </div>
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Trending products carousel */}
                <div className="w-full md:w-1/2 flex justify-center">
                  <div className="relative w-full max-w-[280px] sm:max-w-[340px] md:max-w-[400px]">
                    {/* Glow behind card */}
                    <div className="absolute -inset-4 sm:-inset-6 rounded-3xl blur-2xl opacity-30 z-0" style={{background: 'hsl(22 100% 52%)'}} />
                    <div className="relative z-10 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-white/10 shadow-[0_32px_80px_hsl(0_0%_0%_/_0.4)]">
                      {trendingProducts.length > 0 ? (
                        <div ref={heroEmblaRef} className="overflow-hidden">
                          <div className="flex">
                            {trendingProducts.map((product) => (
                              <div key={product.id} className="flex-[0_0_100%] min-w-0 relative aspect-[3/4] sm:aspect-[4/5]">
                                {product.video_url ? (
                                  <video
                                    src={product.video_url}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    className="w-full h-full object-cover"
                                  />
                                ) : product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full pattern-bg flex items-center justify-center">
                                    <Sparkles className="w-16 h-16 text-primary/40" />
                                  </div>
                                )}
                                {/* Overlay floating badge */}
                                <div className="absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-5 sm:right-5 gradient-glass rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                        <Flame className="w-3 h-3 text-primary" /> Trending Now
                                      </p>
                                      <p className="text-sm font-black text-foreground truncate">
                                        {product.name}
                                      </p>
                                      <p className="text-xs font-bold text-primary mt-0.5">
                                        {formatPrice(product.discount_price || product.price)}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => navigate(`/product/${product.id}`)}
                                      className="shrink-0 w-10 h-10 rounded-full gradient-button flex items-center justify-center shadow-md"
                                    >
                                      <ArrowRight className="w-4 h-4 text-white" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[4/5] pattern-bg flex items-center justify-center">
                          <Sparkles className="w-16 h-16 text-primary/40" />
                        </div>
                      )}
                    </div>
                    {/* Dot indicators */}
                    {trendingProducts.length > 1 && (
                      <div className="flex justify-center gap-2 mt-4 relative z-10">
                        {trendingProducts.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => heroEmblaApi?.scrollTo(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                              i === heroActiveSlide
                                ? 'bg-primary w-7'
                                : 'bg-white/30 hover:bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Marquee strip at bottom of hero */}
            <div className="border-t border-white/10 bg-primary/90 backdrop-blur-sm py-2 sm:py-3 marquee-wrap relative z-10">
              <div className="marquee-track">
                {Array.from({length: 2}).map((_, g) => (
                  <span key={g} className="flex gap-0">
                    {['🔥 Hot Deals', '  ·  ', '⚡ Fast Delivery', '  ·  ', '💯 Original Products', '  ·  ', '🛒 Shop & Save Big', '  ·  ', '❤️ Loved by Nigerians', '  ·  ', '📦 Nationwide Shipping', '  ·  '].map((t, i) => (
                      <span key={i} className="text-white text-xs sm:text-sm font-bold px-2 sm:px-3 whitespace-nowrap">{t}</span>
                    ))}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

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
              {/* Results Header with Sorting */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                      <Package className="h-5 w-5" />
                    </div>
                    {selectedCategory !== 'All' ? selectedCategory : 'All Products'}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {sortedAndFilteredProducts.length} {sortedAndFilteredProducts.length === 1 ? 'product' : 'products'} found
                    {searchTerm && ` for "${searchTerm}"`}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Sort Dropdown */}
                  <div className="relative flex-1 sm:flex-none" ref={sortDropdownRef}>
                    <button
                      onClick={() => setShowSortDropdown(!showSortDropdown)}
                      className="w-full sm:w-auto flex items-center justify-between gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ArrowDownWideNarrow className="h-4 w-4" />
                        <span className="hidden sm:inline">Sort: {getSortLabel(sortBy)}</span>
                        <span className="sm:hidden">Sort</span>
                      </div>
                      <SlidersHorizontal className="h-4 w-4 sm:hidden" />
                    </button>

                    {showSortDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-10">
                        <div className="py-1">
                          {(['newest', 'price-low', 'price-high', 'name-asc', 'name-desc'] as SortOption[]).map((option) => (
                            <button
                              key={option}
                              onClick={() => {
                                setSortBy(option);
                                setShowSortDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${
                                sortBy === option ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                              }`}
                            >
                              {getSortLabel(option)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Clear Filters Button */}
                  {(searchTerm || selectedCategory !== 'All') && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('All');
                        setSortBy('newest');
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <X className="h-4 w-4" />
                      <span className="hidden sm:inline">Clear filters</span>
                    </button>
                  )}
                </div>
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
              ) : sortedAndFilteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                  {sortedAndFilteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                /* No Results - WhatsApp Fallback */
                <div className="text-center py-16">
                  <div className="bg-card p-8 rounded-2xl max-w-md mx-auto border border-border shadow-sm">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Product not found
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      We couldn't find &ldquo;{searchTerm}&rdquo; in our catalog. Would you like to request it?
                    </p>
                    {/* WhatsApp Request Button */}
                    <button
                      onClick={requestProductViaWhatsApp}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-md hover:shadow-lg mb-4 font-bold"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span>Request via WhatsApp</span>
                    </button>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('All');
                      }}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
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
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 p-3 gradient-button text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
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
          className={`fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 p-3 bg-card text-foreground rounded-full shadow-lg hover:bg-muted transition-all duration-300 hover:scale-110 border border-border ${
            showScrollTop 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-10 pointer-events-none'
          }`}
          aria-label="Go to FAQ section"
        >
          <HelpCircle className="h-6 w-6 text-primary" />
        </button>

        {/* Contact Us Popup (WhatsApp) */}
        <ContactUsPopup />
      </main>

      <Footer />
    </div>
  );
};

export default Home;