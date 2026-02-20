import { useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Product } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { cn } from '@/lib/utils';

interface ProductSectionProps {
  title: string;
  icon: React.ReactNode;
  products: Product[];
  showSeeAll?: boolean;
  onSeeAll?: () => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export const ProductSection = ({
  title,
  icon,
  products,
  showSeeAll = true,
  onSeeAll,
  isLoading = false,
  emptyMessage = "No products available"
}: ProductSectionProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320;
      const newScrollLeft = scrollContainerRef.current.scrollLeft + 
        (direction === 'left' ? -scrollAmount : scrollAmount);
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <section className="py-5 sm:py-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl text-orange-600">
            {icon}
          </div>
          <h2 className="text-lg sm:text-2xl font-bold text-foreground">{title}</h2>
        </div>
        
        {showSeeAll && onSeeAll && (
          <button
            onClick={onSeeAll}
            className="group flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
          >
            See All Products
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {/* Products Carousel */}
      <div className="relative group">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm border border-border rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white disabled:opacity-0"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 -mx-2 px-2 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoading ? (
            // Loading Skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[200px] sm:w-[260px] snap-start animate-pulse bg-card rounded-2xl p-4 border border-border"
              >
                <div className="bg-muted aspect-square rounded-xl mb-4"></div>
                <div className="bg-muted h-4 rounded mb-2"></div>
                <div className="bg-muted h-4 rounded w-3/4 mb-2"></div>
                <div className="bg-muted h-6 rounded w-1/2"></div>
              </div>
            ))
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0 w-[200px] sm:w-[260px] snap-start"
              >
                <ProductCard product={product} />
              </div>
            ))
          )}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm border border-border rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white disabled:opacity-0"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      </div>
    </section>
  );
};
