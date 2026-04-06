import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCartContext } from '@/components/ui/cart-provider';
import { useCurrency } from '@/hooks/useCurrency';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { CartBenefits } from '@/components/TrustBadges';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';

const MINIMUM_ORDER = 10000;

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, getTotalPrice, addToCart } = useCartContext();
  const { formatPrice } = useCurrency();

  const totalPrice = getTotalPrice();
  const amountRemaining = Math.max(MINIMUM_ORDER - totalPrice, 0);
  const progressPercentage = Math.min((totalPrice / MINIMUM_ORDER) * 100, 100);
  const canCheckout = totalPrice >= MINIMUM_ORDER;

  const { data: discountedSuggestions } = useQuery({
    queryKey: ['cart-discount-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('in_stock', true)
        .not('discount_price', 'is', null)
        .not('original_price', 'is', null)
        .limit(12);

      if (error) throw error;
      return (data as Product[]) || [];
    },
  });

  const suggestionProducts = useMemo(() => {
    const available = discountedSuggestions || [];
    return [...available].sort(() => Math.random() - 0.5).slice(0, 4);
  }, [discountedSuggestions]);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 page-offset">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4">Your Cart is Empty</h1>
            <p className="text-muted-foreground mb-8">Add some products to get started!</p>
            <Link to="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 pt-24">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 sm:mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Continue Shopping
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Shopping Cart</h1>

        <Card className="mb-6 border-primary/20 bg-card/60">
          <CardContent className="pt-6">
            <div className="mb-3 flex items-center justify-between text-sm font-medium">
              <span>Minimum order to checkout: {formatPrice(MINIMUM_ORDER)}</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-green-500 transition-all duration-700"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="mt-3 text-sm font-medium">
              {canCheckout
                ? "✓ You're ready to checkout! 🎉 Great job unlocking checkout."
                : `Spend ${formatPrice(amountRemaining)} more to unlock checkout!`}
            </p>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-full sm:w-20 h-32 sm:h-20 flex-shrink-0">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          loading="lazy"
                          width={80}
                          height={80}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No image</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{item.product.name}</h3>
                      <p className="text-muted-foreground">{formatPrice(item.product.price)} each</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="text-right flex items-center gap-2 sm:gap-4">
                        <p className="font-semibold">{formatPrice(item.product.price * item.quantity)}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {suggestionProducts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">You might also like</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {suggestionProducts.map((product) => (
                    <div key={product.id} className="rounded-md border p-3">
                      <p className="text-sm font-medium line-clamp-2">{product.name}</p>
                      <div className="mt-1 text-sm">
                        <span className="font-semibold text-primary">{formatPrice(product.discount_price || product.price)}</span>
                        <span className="ml-2 text-xs text-muted-foreground line-through">
                          {formatPrice(product.original_price || product.price)}
                        </span>
                      </div>
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => addToCart(product)}>
                        Add deal
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <CartBenefits />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                {!canCheckout && (
                  <p className="mt-3 text-sm text-amber-700 font-medium">
                    Add {formatPrice(amountRemaining)} more to checkout.
                  </p>
                )}
              </CardContent>
              <CardFooter>
                {canCheckout ? (
                  <Button asChild className="w-full" size="lg">
                    <Link to="/checkout">
                      Proceed to Checkout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" disabled>
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Cart;
