import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCartContext } from '@/components/ui/cart-provider';
import { useCurrency } from '@/hooks/useCurrency';
import { useInventory } from '@/hooks/useInventory';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { CheckoutTrustBadges } from '@/components/TrustBadges';

const Checkout = () => {
  const { cartItems, getTotalPrice, clearCart } = useCartContext();
  const { formatPrice } = useCurrency();
  const { updateInventory } = useInventory();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('orders')
        .insert({
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          customer_phone: formData.customerPhone,
          shipping_address: formData.shippingAddress,
          order_items: cartItems as any,
          total_amount: getTotalPrice(),
        });

      if (error) throw error;
      return null;
    },
    onSuccess: async () => {
      // Update inventory
      updateInventory(cartItems);

      toast({
        title: "Order placed successfully!",
        description: "Please make payment and contact us with proof of payment.",
      });

      // Save order items and total before clearing cart
      const orderData = {
        orderItems: cartItems,
        totalAmount: getTotalPrice(),
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
      };

      clearCart();
      navigate('/order-success', { state: orderData });
    },
    onError: (error) => {
      toast({
        title: "Error placing order",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
      console.error('Order error:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone || !formData.shippingAddress) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    createOrderMutation.mutate();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
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
      
      <main className="container mx-auto px-4 py-8">
        <Link to="/cart" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cart
        </Link>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
              <CheckCircle className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">Cart</span>
          </div>
          <div className="w-12 h-0.5 bg-primary"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
            <span className="text-sm font-medium">Checkout</span>
          </div>
          <div className="w-12 h-0.5 bg-muted"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">3</div>
            <span className="text-sm text-muted-foreground">Complete</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Full Name *</Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="customerEmail">Email Address *</Label>
                  <Input
                    id="customerEmail"
                    name="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="customerPhone">Phone Number *</Label>
                  <Input
                    id="customerPhone"
                    name="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="shippingAddress">Shipping Address *</Label>
                  <Textarea
                    id="shippingAddress"
                    name="shippingAddress"
                    value={formData.shippingAddress}
                    onChange={handleInputChange}
                    rows={3}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? 'Placing Order...' : 'Place Order Now'}
                </Button>
                
                <CheckoutTrustBadges />
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.product.name} x {item.quantity}</span>
                    <span>{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{formatPrice(getTotalPrice())}</span>
                </div>
              </div>
              
              {/* Order benefits */}
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium mb-2">✨ Your order includes:</p>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>✓ Order tracking</li>
                  <li>✓ Fast processing</li>
                  <li>✓ Delivery updates via WhatsApp</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Checkout;