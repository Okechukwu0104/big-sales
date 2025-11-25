import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { Header } from '@/components/Header';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter, X, Sparkles } from 'lucide-react';

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { data: products, isLoading } = useQuery({
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

  // Extract unique categories
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
      if (showMobileFilters) {
        setShowMobileFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileFilters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 transform skew-y-3 scale-125"></div>
          <div className="container mx-auto px-4 py-16 relative">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-blue-200">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Discover Amazing Deals</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                BIG SALES
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
                Discover incredible products at unbeatable prices. Quality you can trust, delivered fast.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-12">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl border border-gray-200">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">Premium Quality</span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl border border-gray-200">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">Fast Shipping</span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl border border-gray-200">
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
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
                {/* Search Bar */}
                <div className={`relative transition-all duration-200 ${
                  isSearchFocused ? 'flex-1' : 'w-full lg:w-80'
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 backdrop-blur-sm"
                  />
                </div>

                {/* Mobile Filter Button */}
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="lg:hidden flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-xl bg-white/90 backdrop-blur-sm hover:bg-gray-50 transition-colors"
                >
                  <Filter className="h-5 w-5" />
                  <span>Filters</span>
                </button>
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
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
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
            <div className="lg:hidden fixed inset-0 bg-black/50 z-40 mt-4">
              <div className="absolute top-0 left-0 right-0 bg-white rounded-b-2xl shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">Categories</h4>
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
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Products Grid */}
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
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
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
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View All Products
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;