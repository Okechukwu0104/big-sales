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

const BUNDLE_DISCOUNT = 0.85; // 15% off

const generateAutoBundles = (products: Product[], seed: number): BundleDeal[] => {
  const available = products.filter(p => p.in_stock && p.price > 0);
  if (available.length < 2) return [];

  const getHash = (str: string) => str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const shuffled = [...available].sort((a, b) => {
    const catA = a.category || 'misc';
    const catB = b.category || 'misc';
    if (catA !== catB) {
      const catValA = (getHash(catA) + seed * 7) % 100;
      const catValB = (getHash(catB) + seed * 7) % 100;
      if (catValA !== catValB) return catValA - catValB;
      return catA.localeCompare(catB);
    }
    const idValA = (getHash(a.id) + seed * 13) % 100;
    const idValB = (getHash(b.id) + seed * 13) % 100;
    if (idValA !== idValB) return idValA - idValB;
    return a.id.localeCompare(b.id);
  });

  const bundles: BundleDeal[] = [];

  for (let i = 0; i < Math.min(2, Math.floor(shuffled.length / 3) || 1); i++) {
    const group = [
      shuffled[i * 3],
      shuffled[i * 3 + 1],
      shuffled[i * 3 + 2]
    ].filter(Boolean);

    if (group.length < 2) break;

    group.sort((a, b) => b.price - a.price);

    const mainProduct = group[0];
    const additions = group.slice(1);
    const sumOfAllThree = group.reduce((sum, p) => sum + p.price, 0);
    const bundlePrice = Math.round(sumOfAllThree * BUNDLE_DISCOUNT);
    const percentageOff = Math.round((1 - BUNDLE_DISCOUNT) * 100);

    bundles.push({
      id: `bundle-${mainProduct.id}-${seed}`,
      mainProduct,
      additions,
      bundlePrice,
      originalValue: sumOfAllThree,
      percentageOff
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

  const refreshDeals = () => setSeed((prev) => prev + 1);

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
    <div className="space-y-3 pb-2 max-h-[70vh] overflow-y-auto">
      <div className="space-y-1 px-1">
        <h3 className="text-sm sm:text-base font-semibold">🔥 Flash Deals — Don't Miss Out!</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Limited Time Deal! These prices can disappear soon.
        </p>
      </div>

      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
        {manualDeals.map((product) => {
          const percentageOff = Math.round(
            (((product.original_price || 0) - (product.discount_price || 0)) /
              (product.original_price || 1)) *
              100,
          );

          return (
            <div key={product.id} className="rounded-lg border p-2 sm:p-3">
              <div className="flex gap-2 sm:gap-3">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-12 w-12 sm:h-16 sm:w-16 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-md bg-muted" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs sm:text-sm font-medium">{product.name}</p>
                  <div className="mt-1 flex items-center gap-1.5 sm:gap-2">
                    <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
                      {formatPrice(product.original_price || product.price)}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-primary">
                      {formatPrice(product.discount_price || product.price)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] sm:text-xs font-semibold text-orange-600">{percentageOff}% OFF</p>
                </div>
              </div>

              <div className="mt-2 sm:mt-3 flex items-center justify-between gap-2">
                <p className="text-[10px] sm:text-xs text-destructive font-medium">⏰ Ends in 09:59</p>
                <Button size="sm" className="h-7 text-xs sm:h-8 sm:text-sm" onClick={() => handleAddManualToCart(product)}>
                  Add to Cart
                </Button>
              </div>
            </div>
          );
        })}

        {autoBundles.map((bundle) => (
          <div key={bundle.id} className="rounded-lg border p-2 sm:p-3 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <div className="flex -space-x-2 sm:-space-x-3 overflow-hidden">
                  <img
                    src={bundle.mainProduct.image_url || '/placeholder.svg'}
                    alt=""
                    className="inline-block h-9 w-9 sm:h-12 sm:w-12 rounded-full ring-2 ring-background object-cover bg-muted"
                    style={{ zIndex: 20 }}
                  />
                  {bundle.additions.map((p, i) => (
                    <img
                      key={i}
                      src={p.image_url || '/placeholder.svg'}
                      alt=""
                      className="inline-block h-9 w-9 sm:h-12 sm:w-12 rounded-full ring-2 ring-background object-cover bg-muted"
                      style={{ zIndex: 10 - i }}
                    />
                  ))}
                </div>
                <div className="min-w-0 flex-1 pl-1 sm:pl-2">
                  <p className="text-xs sm:text-sm font-bold text-primary leading-tight">Bundle Offer!</p>
                  <p className="mt-0.5 text-[10px] sm:text-xs font-semibold text-green-600 bg-green-50 rounded-full px-1.5 sm:px-2 py-0.5 inline-block">+{bundle.additions.length} Items FREE</p>
                </div>
              </div>

              <div className="min-w-0 flex-1 mb-2 sm:mb-3 bg-muted/30 p-1.5 sm:p-2 rounded-md border border-border/50">
                <p className="line-clamp-2 text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                  Buy <span className="font-semibold text-foreground">{bundle.mainProduct.name}</span>, get
                  {bundle.additions.map((a, i) => <span key={i} className="font-semibold text-foreground"> {a.name}{i === 0 && bundle.additions.length > 1 ? ' & ' : ''}</span>)} FREE!
                </p>
              </div>

              <div className="mt-1 flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
                  {formatPrice(bundle.originalValue)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-foreground">
                  {formatPrice(bundle.bundlePrice)}
                </span>
                {bundle.percentageOff > 0 && (
                  <span className="ml-auto text-[9px] sm:text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full uppercase tracking-wider">Save {bundle.percentageOff}%</span>
                )}
              </div>
            </div>

            <div className="mt-2 sm:mt-4 flex items-center justify-between gap-2 border-t pt-2 sm:pt-3">
              <p className="text-[10px] sm:text-xs text-destructive font-medium flex items-center gap-1">
                ⏰ <span className="pt-0.5">09:59</span>
              </p>
              <Button size="sm" className="h-7 text-xs sm:h-8 sm:text-sm bg-green-600 hover:bg-green-700 text-white shadow-sm" onClick={() => handleAddBundleToCart(bundle)}>
                Add Bundle
              </Button>
            </div>
          </div>
        ))}
      </div>

      {!hasDeals && (
        <p className="text-xs sm:text-sm text-muted-foreground">No flash deals available right now.</p>
      )}

      {hasDeals && (
        <div className="flex justify-end pt-1 sm:pt-2">
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm" onClick={refreshDeals}>
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
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-sm">Recommended for you</DrawerTitle>
            <DrawerDescription className="text-xs">Quick deals to boost your cart value.</DrawerDescription>
          </DrawerHeader>
          <div className="px-3 pb-4">{content}</div>
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
