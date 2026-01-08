import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { Header } from '@/components/Header';
import { TrustBadges } from '@/components/TrustBadges';
import { TestimonialCarousel } from '@/components/TestimonialCarousel';
import { FAQ } from '@/components/FAQ';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter, X, Sparkles, Loader2 } from 'lucide-react';

// Constants for pagination
const ITEMS_PER_PAGE = 12; // Optimal batch size for smooth scrolling

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const mobileFiltersRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // Fetch categories separately to avoid re-fetching on scroll
  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);
      
      if (error) throw error;
      const uniqueCategories = new Set(data.map(p => p.category).filter(Boolean));
      return ['All', ...Array.from(uniqueCategories).sort()];
    },
  });

  // Use infinite query for paginated products
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteQuery({
    queryKey: ['products-infinite', searchTerm, selectedCategory],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(pageParam * ITEMS_PER_PAGE, (pageParam + 1) * ITEMS_PER_PAGE - 1);
      
      // Apply filters if needed
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
      }
      
      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return {
        products: data as Product[],
        nextPage: (data.length === ITEMS_PER_PAGE) ? pageParam + 1 : null,
        totalCount: count || 0
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    staleTime: 60 * 1000, // 1 minute cache
    refetchOnWindowFocus: false,
  });

  // Extract all products from pages
  const products = useMemo(() => {
    return data?.pages.flatMap(page => page.products) || [];
  }, [data]);

  // Total count for display
  const totalCount = data?.pages[0]?.totalCount || 0;

  // Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: '200px', // Load next batch 200px before reaching bottom
        threshold: 0.1,
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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

  // Reset scroll position when filters change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchTerm, selectedCategory]);

  // Memoize categories
  const categories = useMemo(() => {
    return categoriesData || ['All'];
  }, [categoriesData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Header */}
      <Header />
      
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
                      {products.length} of {totalCount} items
                    </span>
                    {(searchTerm || selectedCategory !== 'All') && (
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedCategory('All');
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

        {/* Products Grid with Infinite Scroll */}
        <section className="container mx-auto px-4 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                  <div className="bg-gray-200 aspect-square rounded-xl mb-4"></div>
                  <div className="bg-gray-200 h-4 rounded mb-2"></div>
                  <div className="bg-gray-200 h-4 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-16">
              <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl max-w-md mx-auto border border-gray-200 shadow-sm">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Something went wrong
                </h3>
                <p className="text-gray-600 mb-4">
                  {error instanceof Error ? error.message : 'Failed to load products'}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              
              {/* Observer target for infinite scroll */}
              <div ref={observerTarget} className="h-10 flex items-center justify-center py-4">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
                    <span className="text-sm text-gray-600">Loading more products...</span>
                  </div>
                )}
                
                {!hasNextPage && products.length > 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      You've seen all {totalCount} products
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <div className="w-16 h-px bg-gray-200"></div>
                      <span className="text-xs text-gray-400">End of results</span>
                      <div className="w-16 h-px bg-gray-200"></div>
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

export default Home;