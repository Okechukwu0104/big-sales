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
import { useMutation, useQuery } from '@tanstack/react-query';
import { StoreConfig } from '@/types';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';

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

  const { data: storeConfig } = useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_config')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as StoreConfig;
    },
  });

  // Function to open WhatsApp with the pre-configured message
  const openWhatsApp = () => {
    if (!storeConfig?.whatsapp_number) {
      toast({
        title: "WhatsApp not configured",
        description: "Please contact the store owner for payment instructions.",
        variant: "destructive",
      });
      return;
    }

    // Clean the phone number
    const cleaned = storeConfig.whatsapp_number.replace(/[^\d+]/g, '');
    const phoneNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;

    // Create order summary
    const orderSummary = cartItems.map(item => 
      `• ${item.product.name} x ${item.quantity} - ${formatPrice(item.product.price * item.quantity)}`
    ).join('%0A');

    const totalAmount = formatPrice(getTotalPrice());

    // Combine pre-configured message with order summary
    const baseMessage = storeConfig.whatsapp_message || 'Hello, I have completed my order and made payment. Here are my order details:';
    
    const fullMessage = `${baseMessage}%0A%0A` +
      `*Order Summary:*%0A` +
      `${orderSummary}%0A` +
      `*Total: ${totalAmount}*%0A%0A` +
      `*My Details:*%0A` +
      `Name: ${formData.customerName || 'Not provided'}%0A` +
      `Phone: ${formData.customerPhone || 'Not provided'}`;

    // Create both deep link and web link
    const deepLink = `whatsapp://send?phone=${phoneNumber.replace('+', '')}&text=${fullMessage}`;
    const webLink = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${fullMessage}`;

    // Try to open the deep link with fallback
    const fallbackTimer = setTimeout(() => {
      window.open(webLink, '_blank');
    }, 1000);

    const link = document.createElement('a');
    link.href = deepLink;
    link.target = '_blank';
    
    link.addEventListener('click', () => {
      clearTimeout(fallbackTimer);
    });
    
    setTimeout(() => {
      clearTimeout(fallbackTimer);
    }, 500);
    
    link.click();
  };

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

      // Open WhatsApp with the pre-configured message
      if (storeConfig?.whatsapp_number) {
        openWhatsApp();
      }

      clearCart();
      navigate('/order-success');
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
                  {createOrderMutation.isPending ? 'Placing Order...' : 'Place Order'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {storeConfig?.payment_details ? (
                    <div className="bg-muted p-4 rounded-md">
                      <pre className="whitespace-pre-wrap text-sm">{storeConfig.payment_details}</pre>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Payment details will be provided after order confirmation.</p>
                  )}
                  
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      After placing your order and making payment:
                    </p>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={openWhatsApp}
                        disabled={!storeConfig?.whatsapp_number}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Contact via WhatsApp
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Click to open WhatsApp with the store's pre-configured message
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;