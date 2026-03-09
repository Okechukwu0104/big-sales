import { Product } from '@/types';
import { useCurrency } from '@/hooks/useCurrency';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Search, TrendingUp } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/optimized-image';

interface InstantSearchDropdownProps {
  searchTerm: string;
  products: Product[];
  isLoading: boolean;
  onClose: () => void;
  onRequestWhatsApp: () => void;
}

export const InstantSearchDropdown = ({
  searchTerm,
  products,
  isLoading,
  onClose,
  onRequestWhatsApp,
}: InstantSearchDropdownProps) => {
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const handleProductClick = (productId: string) => {
    onClose();
    navigate(`/product/${productId}`);
  };

  if (!searchTerm.trim()) return null;

  const results = products.slice(0, 5);

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      {isLoading ? (
        <div className="p-6 text-center">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Searching...</p>
        </div>
      ) : results.length > 0 ? (
        <div>
          <div className="px-4 py-2.5 border-b border-border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" />
              {products.length} {products.length === 1 ? 'result' : 'results'} found
            </p>
          </div>
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleProductClick(product.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/10 transition-colors text-left border-b border-border/50 last:border-0"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                <OptimizedImage
                  src={product.image_url}
                  alt={product.name}
                  className="w-10 h-10 rounded-lg"
                  containerClassName="w-10 h-10"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">
                    {formatPrice(product.discount_price || product.price)}
                  </span>
                  {product.original_price && product.original_price > (product.discount_price || product.price) && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(product.original_price)}
                    </span>
                  )}
                </div>
              </div>
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
          {products.length > 5 && (
            <div className="px-4 py-2.5 bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">
                +{products.length - 5} more results — press Enter to see all
              </p>
            </div>
          )}
        </div>
      ) : (
        /* No results — WhatsApp fallback */
        <div className="p-6 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm font-medium text-foreground mb-1">
            No results for "{searchTerm}"
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Can't find what you need? Ask us directly!
          </p>
          <button
            onClick={() => {
              onClose();
              onRequestWhatsApp();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium shadow-md"
          >
            <MessageCircle className="h-4 w-4" />
            Request via WhatsApp
          </button>
        </div>
      )}
    </div>
  );
};
