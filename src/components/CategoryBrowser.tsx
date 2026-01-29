import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types';
import { Package, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryBrowserProps {
  onCategorySelect: (category: string) => void;
  selectedCategory?: string;
}

export const CategoryBrowser = ({ onCategorySelect, selectedCategory }: CategoryBrowserProps) => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Category[];
    },
  });

  if (isLoading) {
    return (
      <section className="py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl text-orange-600">
            <Grid3X3 className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Browse by Category</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-card rounded-2xl p-4 border border-border aspect-square">
              <div className="bg-muted w-12 h-12 rounded-xl mx-auto mb-3"></div>
              <div className="bg-muted h-4 rounded w-3/4 mx-auto"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl text-orange-600">
          <Grid3X3 className="h-5 w-5" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Browse by Category</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* All Products Card */}
        <button
          onClick={() => onCategorySelect('All')}
          className={cn(
            "group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] p-6 text-center",
            selectedCategory === 'All' || !selectedCategory
              ? "bg-gradient-to-br from-orange-500 to-amber-500 border-orange-500 text-white shadow-md"
              : "bg-card border-border hover:border-orange-300"
          )}
        >
          <div className={cn(
            "w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-colors",
            selectedCategory === 'All' || !selectedCategory
              ? "bg-white/20"
              : "bg-gradient-to-br from-orange-100 to-amber-100"
          )}>
            <Package className={cn(
              "h-6 w-6",
              selectedCategory === 'All' || !selectedCategory
                ? "text-white"
                : "text-orange-600"
            )} />
          </div>
          <span className={cn(
            "font-medium text-sm",
            selectedCategory === 'All' || !selectedCategory
              ? "text-white"
              : "text-foreground"
          )}>
            All Products
          </span>
        </button>

        {/* Category Cards */}
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategorySelect(category.name)}
            className={cn(
              "group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] p-6 text-center",
              selectedCategory === category.name
                ? "bg-gradient-to-br from-orange-500 to-amber-500 border-orange-500 text-white shadow-md"
                : "bg-card border-border hover:border-orange-300"
            )}
          >
            {category.image_url ? (
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl overflow-hidden">
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className={cn(
                "w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-colors",
                selectedCategory === category.name
                  ? "bg-white/20"
                  : "bg-gradient-to-br from-orange-100 to-amber-100"
              )}>
                {category.icon ? (
                  <span className="text-2xl">{category.icon}</span>
                ) : (
                  <Package className={cn(
                    "h-6 w-6",
                    selectedCategory === category.name
                      ? "text-white"
                      : "text-orange-600"
                  )} />
                )}
              </div>
            )}
            <span className={cn(
              "font-medium text-sm line-clamp-2",
              selectedCategory === category.name
                ? "text-white"
                : "text-foreground"
            )}>
              {category.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};
