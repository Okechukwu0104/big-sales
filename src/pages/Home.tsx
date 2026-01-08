import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { Header } from '@/components/Header';
import { TrustBadges } from '@/components/TrustBadges';
import { TestimonialCarousel } from '@/components/TestimonialCarousel';
import { FAQ } from '@/components/FAQ';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter, X, Sparkles, HelpCircle } from 'lucide-react';

const PRODUCTS_PER_PAGE = 16; // Number of products to load per page

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mobileFiltersRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  // Fetch products with pagination
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', page],
    queryFn: async () => {
      const from = page * PRODUCTS_PER_PAGE;
      const to = from + PRODUCTS_PER_PAGE - 1;
      
      const { data, error, count } = await supabase
        .from('products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) throw error;
      
      // Check if there are more products to load
      if (count !== null) {
        setHasMore(to + 1 < count);
      }
      
      return data as Product[];
    },
  });

  // Update allProducts when new data is fetched
  useEffect(() => {
    if (productsData) {
      if (page === 0) {
        setAllProducts(productsData);
      } else {
        setAllProducts(prev => [...prev, ...productsData]);
      }
    }
  }, [productsData, page]);

  // Extract unique categories
  const categories = useMemo(() => {
    if (!allProducts) return ['All'];
    const uniqueCategories = new Set(allProducts.map(p => p.category).filter(Boolean));
    return ['All', ...Array.from(uniqueCategories).sort()];
  }, [allProducts]);

  // Filter products based on search term and category
  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    
    let filtered = allProducts;
    
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
  }, [allProducts, searchTerm, selectedCategory]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(0);
    setAllProducts([]);
  }, [searchTerm, selectedCategory]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (isLoading || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
    };
  }, [isLoading, hasMore]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = scrollContainerRef.current.scrollLeft + 
        (direction === 'left' ? -scrollAmount : scrollAmount);
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

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

  // Handle help button click
  const handleHelpClick = () => {
    // Using Deep for in-app help
    if (window.Deep) {
      // Initialize Deep conversation
      window.Deep.initializeConversation({
        welcomeMessage: "Hi! I'm here to help you find the perfect products. What are you looking for today?",
        autoStart: true
      });
    } 
    // Fallback to Weblink
    else if (window.Weblink) {
      window.Weblink.openHelpDesk({
        category: 'shopping-assistance'
      });
    }
    // Fallback to opening a help page
    else {
      window.open('/help', '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header */}
      <Header />
      
      {/* Floating Help Button */}
      <button
        onClick={handleHelpClick}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 group"
      >
        <HelpCircle className="h-5 w-5 group-hover:animate-pulse" />
        <span className="font-medium">Need Help?</span>
      </button>
      
      {/* Main Content */}
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-[url('/public/images/bg-pattern.png')] bg-cover bg-center bg-no-repeat">
          <div className="absolute inset-0 bg-black/5 backdrop-blur-[2px]"></div>

          <div className="container mx-auto px-4 py-16 relative">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-orange-200">
                <Sparkles className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Discover Amazing Deals</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                BIG SALES
              </h1>
              
              <p className="text-xl md:text-2xl text-orange-200 mb-8 leading-relaxed">
                Discover incredible products at unbeatable prices. Quality you can trust, delivered fast.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-12">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl border border-gray-200">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">Premium Quality</span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl border border-gray-200">
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">Fast Shipping</span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl border border-gray-200">
                  <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">Best Prices</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Floating Search Bar */}
        <div className="sticky top-20 z-30 px-4 py-4 bg-white/80 backdrop-blur-lg border-b border-gray-200 shadow-sm">
          <div className="container mx-auto">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Left Section - Title and Results */}
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900 hidden sm:block">
                  Our Products
                </h2>
                {(searchTerm || selectedCategory !== 'All') && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
                    </span>
                    {(searchTerm || selectedCategory !== 'All') && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategory('All');
                          setPage(0);
                          setAllProducts([]);
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        Clear filters
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right Section - Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {/* Mobile: Search and Filter in one line */}
                <div className="lg:hidden flex gap-3 w-full">
                  {/* Search Bar */}
                  <div className={`relative transition-all duration-200 flex-1`}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/90 backdrop-blur-sm"
                    />
                  </div>

                  {/* Mobile Filter Button */}
                  <button
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl bg-white/90 backdrop-blur-sm hover:bg-gray-50 transition-colors flex-shrink-0"
                  >
                    <Filter className="h-5 w-5" />
                    <span className="sr-only">Filters</span>
                  </button>
                </div>

                {/* Desktop: Original layout */}
                <div className="hidden lg:flex flex-row gap-3 w-full lg:w-auto">
                  {/* Search Bar */}
                  <div className={`relative transition-all duration-200 ${
                    isSearchFocused ? 'flex-1' : 'w-80'
                  }`}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white/90 backdrop-blur-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category Filters - Desktop */}
            {categories.length > 1 && (
              <div className="hidden lg:block mt-4">
                <div className="flex items-center gap-2">
                  {categories.length > 6 && (
                    <button
                      onClick={() => scroll('left')}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                  
                  <div 
                    ref={scrollContainerRef}
                    className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth py-2"
                  >
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setPage(0);
                          setAllProducts([]);
                        }}
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

                  {categories.length > 6 && (
                    <button
                      onClick={() => scroll('right')}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Filters Overlay */}
          {showMobileFilters && (
            <>
              <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowMobileFilters(false)} />
              <div 
                ref={mobileFiltersRef}
                className="lg:hidden fixed top-20 left-4 right-4 bg-white rounded-2xl shadow-xl p-6 z-50 animate-in slide-in-from-top-5 duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3 text-gray-900">Categories</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((category) => (
                        <button
                          key={category}
                          onClick={() => {
                            setSelectedCategory(category);
                            setPage(0);
                            setAllProducts([]);
                            setShowMobileFilters(false);
                          }}
                          className={`p-3 rounded-xl text-sm font-medium transition-all border ${
                            selectedCategory === category
                              ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="w-full py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Products Grid */}
        <section className="container mx-auto px-4 py-8">
          {isLoading && page === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <div className="bg-gray-200 aspect-square rounded-xl mb-4"></div>
                  <div className="bg-gray-200 h-4 rounded mb-2"></div>
                  <div className="bg-gray-200 h-4 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              
              {/* Loading indicator for additional pages */}
              {isLoading && page > 0 && (
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`loading-${i}`} className="animate-pulse bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                      <div className="bg-gray-200 aspect-square rounded-xl mb-4"></div>
                      <div className="bg-gray-200 h-4 rounded mb-2"></div>
                      <div className="bg-gray-200 h-4 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Sentinel element for infinite scroll */}
              <div 
                ref={sentinelRef}
                className="h-10 mt-8 flex items-center justify-center"
              >
                {hasMore && !isLoading && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading more products...</span>
                  </div>
                )}
                {!hasMore && filteredProducts.length > 0 && (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
                      <span className="text-gray-600">🎉</span>
                      <span className="text-gray-700 font-medium">You've seen all products!</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl max-w-md mx-auto border border-gray-200 shadow-sm">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchTerm || selectedCategory !== 'All' 
                    ? "No products found" 
                    : "No products available"
                  }
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedCategory !== 'All'
                    ? "Try adjusting your search terms or browse different categories."
                    : "Check back soon for new arrivals!"
                  }
                </p>
                {(searchTerm || selectedCategory !== 'All') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('All');
                      setPage(0);
                      setAllProducts([]);
                    }}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    View All Products
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Trust Badges Section */}
        <TrustBadges />

        {/* Customer Testimonials */}
        <TestimonialCarousel />

        {/* FAQ Section */}
        <FAQ />
      </main>
    </div>
  );
};

// Add TypeScript declarations for Deep and Weblink
declare global {
  interface Window {
    Deep?: {
      initializeConversation: (options: {
        welcomeMessage: string;
        autoStart: boolean;
      }) => void;
    };
    Weblink?: {
      openHelpDesk: (options: { category: string }) => void;
    };
  }
}

export default Home;