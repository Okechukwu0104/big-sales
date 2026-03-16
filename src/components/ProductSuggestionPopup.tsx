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

const pickFlashDeals = (products: Product[]) => {
  const discountedProducts = products.filter(
    (product) =>
      product.in_stock &&
      product.discount_price !== null &&
      product.original_price !== null &&
      product.original_price > product.discount_price,
  );

  return [...discountedProducts]
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);
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

  const flashDeals = useMemo(() => {
    return pickFlashDeals(products);
  }, [products, seed]);

  const refreshDeals = () => {
    setSeed((prev) => prev + 1);
  };

  const content = (
    <div className="space-y-4 pb-2">
      <div className="space-y-1 px-1">
        <h3 className="text-base font-semibold">🔥 Flash Deals — Don't Miss Out!</h3>
        <p className="text-sm text-muted-foreground">
          Limited Time Deal! These prices can disappear soon.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {flashDeals.map((product) => {
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
                <p className="text-xs text-destructive">⏰ Ends in 09:59</p>
                <Button
                  size="sm"
                  onClick={() => {
                    addToCart(product);
                    onOpenChange(false);
                  }}
                >
                  Add to Cart
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {flashDeals.length === 0 && (
        <p className="text-sm text-muted-foreground">No flash deals available right now.</p>
      )}

      {flashDeals.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={refreshDeals}>
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
