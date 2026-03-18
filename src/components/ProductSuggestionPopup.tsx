import { useMemo, useState } from 'react';
import { Product } from '@/types';
import { useCurrency } from '@/hooks/useCurrency';
import { useCartContext } from '@/components/ui/cart-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus } from 'lucide-react';

interface ProductSuggestionPopupProps {
  products: Product[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BundleDeal {
  id: string;
  mainProduct: Product;
  additions: Product[];
  bundlePrice: number;
  originalValue: number;
  percentageOff: number;
}

const generateAutoBundles = (products: Product[], seed: number): BundleDeal[] => {
  const available = products.filter(p => p.in_stock && p.price > 0);
  if (available.length < 2) return [];

  // Simple string hasher for pseudo-randomness
  const getHash = (str: string) => str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // Sort logically: first by a randomized category order, then by randomized items within category
  const shuffled = [...available].sort((a, b) => {
    const catA = a.category || 'misc';
    const catB = b.category || 'misc';
    
    // 1. Group by category (with random order of categories)
    if (catA !== catB) {
      const catValA = (getHash(catA) + seed * 7) % 100;
      const catValB = (getHash(catB) + seed * 7) % 100;
      if (catValA !== catValB) return catValA - catValB;
      return catA.localeCompare(catB); // tie breaker
    }
    
    // 2. Randomize items within the same category
    const idValA = (getHash(a.id) + seed * 13) % 100;
    const idValB = (getHash(b.id) + seed * 13) % 100;
    if (idValA !== idValB) return idValA - idValB;
    return a.id.localeCompare(b.id);
  });

  const bundles: BundleDeal[] = [];
  
  // Create up to 2 bundles
  for (let i = 0; i < Math.min(2, Math.floor(shuffled.length / 3) || 1); i++) {
    const group = [
      shuffled[i * 3],
      shuffled[i * 3 + 1],
      shuffled[i * 3 + 2]
    ].filter(Boolean);

    if (group.length < 2) break;

    // The most expensive item becomes the primary product
    group.sort((a, b) => b.price - a.price);
    
    const mainProduct = group[0];
    const additions = group.slice(1);

    const sumOfAllThree = group.reduce((sum, p) => sum + p.price, 0);
    const bundlePrice = Math.round(sumOfAllThree * 1.10);

    bundles.push({
      id: `bundle-${mainProduct.id}-${seed}`,
      mainProduct,
      additions,
      bundlePrice,
      originalValue: sumOfAllThree,
      percentageOff: 0
    });
  }

  return bundles;
};

export const ProductSuggestionPopup = ({
  products,
  open,
  onOpenChange,
}: ProductSuggestionPopupProps) => {
  const isMobile = useIsMobile();
  const { formatPrice } = useCurrency();
  const { addToCart } = useCartContext();
  const [seed, setSeed] = useState(0);

  const { manualDeals, autoBundles } = useMemo(() => {
    const discountedProducts = products.filter(
      (product) =>
        product.in_stock &&
        product.discount_price !== null &&
        product.original_price !== null &&
        product.original_price > product.discount_price,
    );

    if (discountedProducts.length > 0) {
       return {
         manualDeals: [...discountedProducts].sort(() => Math.random() - 0.5).slice(0, 4),
         autoBundles: []
       };
    }

    return {
       manualDeals: [],
       autoBundles: generateAutoBundles(products, seed).slice(0, 4)
    };
  }, [products, seed]);

  const refreshDeals = () => {
    setSeed((prev) => prev + 1);
  };

  const handleAddManualToCart = (product: Product) => {
    addToCart(product);
    onOpenChange(false);
  };

  const handleAddBundleToCart = (bundle: BundleDeal) => {
    addToCart({ ...bundle.mainProduct, price: bundle.bundlePrice }, 1);
    bundle.additions.forEach(p => {
      addToCart({ ...p, price: 0 }, 1);
    });
    onOpenChange(false);
  };

  const hasDeals = manualDeals.length > 0 || autoBundles.length > 0;

  const content = (
    <div className="space-y-4 pb-2">
      <div className="space-y-1 px-1">
        <h3 className="text-base font-semibold">🔥 Flash Deals — Don't Miss Out!</h3>
        <p className="text-sm text-muted-foreground">
          Limited Time Deal! These prices can disappear soon.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {manualDeals.map((product) => {
          const percentageOff = Math.round(
            (((product.original_price || 0) - (product.discount_price || 0)) /
              (product.original_price || 1)) *
              100,
          );

          return (
            <div key={product.id} className="rounded-lg border p-3">
              <div className="flex gap-3">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-16 w-16 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-md bg-muted" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(product.original_price || product.price)}
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {formatPrice(product.discount_price || product.price)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-orange-600">{percentageOff}% OFF</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-destructive font-medium">⏰ Ends in 09:59</p>
                <Button size="sm" onClick={() => handleAddManualToCart(product)}>
                  Add to Cart
                </Button>
              </div>
            </div>
          );
        })}

        {autoBundles.map((bundle) => (
          <div key={bundle.id} className="rounded-lg border p-3 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex -space-x-3 overflow-hidden">
                  <img src={bundle.mainProduct.image_url || '/placeholder.svg'} alt="" className="inline-block h-12 w-12 rounded-full ring-2 ring-background object-cover bg-muted z-20" />
                  {bundle.additions.map((p, i) => (
                    <img key={i} src={p.image_url || '/placeholder.svg'} alt="" className={`inline-block h-12 w-12 rounded-full ring-2 ring-background object-cover bg-muted z-${10 - i}`} />
                  ))}
                </div>
                <div className="min-w-0 flex-1 pl-2">
                  <p className="text-sm font-bold text-primary leading-tight">Bundle Offer!</p>
                  <p className="mt-0.5 text-xs font-semibold text-green-600 bg-green-50 rounded-full px-2 py-0.5 inline-block">+{bundle.additions.length} Items FREE</p>
                </div>
              </div>

              <div className="min-w-0 flex-1 mb-3 bg-muted/30 p-2 rounded-md border border-border/50">
                 <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                   Buy <span className="font-semibold text-foreground">{bundle.mainProduct.name}</span>, get 
                   {bundle.additions.map((a, i) => <span key={i} className="font-semibold text-foreground"> {a.name}{i === 0 && bundle.additions.length > 1 ? ' & ' : ''}</span>)} FREE!
                 </p>
              </div>

              <div className="mt-1 flex items-center gap-2">
                {bundle.originalValue > bundle.bundlePrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatPrice(bundle.originalValue)}
                  </span>
                )}
                <span className="text-sm font-bold text-foreground">
                  {formatPrice(bundle.bundlePrice)}
                </span>
                {bundle.percentageOff > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded-full uppercase tracking-wider">Save {bundle.percentageOff}%</span>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
              <p className="text-xs text-destructive font-medium flex items-center gap-1">
                ⏰ <span className="pt-0.5">09:59</span>
              </p>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => handleAddBundleToCart(bundle)}>
                Add Bundle
              </Button>
            </div>
          </div>
        ))}

      </div>

      {!hasDeals && (
        <p className="text-sm text-muted-foreground">No flash deals available right now.</p>
      )}

      {hasDeals && (
        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={refreshDeals}>
            Show other deals
          </Button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Recommended for you</DrawerTitle>
            <DrawerDescription>Quick deals to boost your cart value.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
         <DialogHeader>
          <DialogTitle>Recommended for you</DialogTitle>
          <DialogDescription>Quick deals to boost your cart value.</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
