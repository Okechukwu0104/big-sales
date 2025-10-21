import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { Header } from '@/components/Header';
import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

const Home = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
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

  return (
    <div className="min-h-screen gradient-hero relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      <Header />
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        <section className="mb-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-8xl font-bold mb-6 float">
              Welcome to <span className="glow-text">BIG SALES</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Discover amazing products at unbeatable prices. Quality guaranteed, fast shipping, excellent customer service.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <div className="px-4 py-2 gradient-glass rounded-full text-sm font-medium">✨ Premium Quality</div>
              <div className="px-4 py-2 gradient-glass rounded-full text-sm font-medium">🚚 Fast Shipping</div>
              <div className="px-4 py-2 gradient-glass rounded-full text-sm font-medium">💝 Great Prices</div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
            <h2 className="text-4xl font-bold hero-text">Our Amazing Products</h2>
            
            {/* Search Bar */}
            <div className="relative w-full md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary "
              />
            </div>
          </div>
          
          {/* Category Filter */}
          {/* Simple horizontal scroll without buttons */}
{categories.length > 1 && (
  <div className="mb-8">
    <div className="flex space-x-3 overflow-x-auto pb-4 scrollbar-thin ...">
      {categories.map((category) => (
        <button
          key={category}
          className="flex-shrink-0 px-6 py-3 rounded-full text-sm font-medium transition-all whitespace-nowrap min-w-max"
        >
          {category}
        </button>
      ))}
    </div>
  </div>
)}
          
          {/* Search results info */}
          {(searchTerm || selectedCategory !== 'All') && (
            <div className="mb-6 text-center">
              <p className="text-muted-foreground">
                {filteredProducts.length > 0 
                  ? `Found ${filteredProducts.length} product${filteredProducts.length === 1 ? '' : 's'}${
                      searchTerm ? ` matching "${searchTerm}"` : ''
                    }${selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}`
                  : `No products found${searchTerm ? ` matching "${searchTerm}"` : ''}${
                      selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''
                    }`
                }
              </p>
            </div>
          )}
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse card-modern p-6">
                  <div className="bg-muted aspect-square rounded-lg mb-4 shimmer"></div>
                  <div className="bg-muted h-4 rounded mb-2 shimmer"></div>
                  <div className="bg-muted h-4 rounded w-3/4 shimmer"></div>
                </div>
              ))}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="gradient-glass p-8 rounded-2xl max-w-md mx-auto">
                <div className="text-6xl mb-4">🛍️</div>
                <p className="text-muted-foreground text-xl font-medium">
                  {searchTerm || selectedCategory !== 'All'
                    ? "No products found. Try different keywords or select another category!"
                    : "No products available at the moment. Check back soon!"
                  }
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;