import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Star, Package, Search, ShoppingBag, HelpCircle, MessageCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StoreConfig } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCurrency } from '@/hooks/useCurrency';

interface OrderItem {
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
}

interface OrderData {
  orderItems: OrderItem[];
  totalAmount: number;
  customerName: string;
  customerPhone: string;
}

const OrderSuccess = () => {
  const { toast } = useToast();
  const location = useLocation();
  const { formatPrice } = useCurrency();
  const [customerRemark, setCustomerRemark] = useState('');
  
  // Get order data from navigation state
  const orderData = location.state as OrderData | null;
  const orderItems = orderData?.orderItems || [];

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

  // Generate a simple order reference
  const orderRef = `ORD-${Date.now().toString(36).toUpperCase()}`;

  const openWhatsApp = () => {
    if (!storeConfig?.whatsapp_number) {
      toast({
        title: "WhatsApp not configured",
        description: "Please contact the store owner directly.",
        variant: "destructive",
      });
      return;
    }

    const cleaned = storeConfig.whatsapp_number.replace(/[^\d+]/g, '');
    const phoneNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;

    // Build order summary for WhatsApp message
    const orderSummary = orderItems.map(item => 
      `• ${item.product.name} x ${item.quantity}`
    ).join('%0A');

    const message = 
      `Hello, I have placed an order and made payment.%0A%0A` +
      `*Order Summary:*%0A${orderSummary}%0A%0A` +
      `*Customer:* ${orderData?.customerName || 'N/A'}%0A` +
      `*Phone:* ${orderData?.customerPhone || 'N/A'}%0A%0A` +
      `${customerRemark ? `*Additional Remarks:*%0A${customerRemark}` : ''}`;

    const deepLink = `whatsapp://send?phone=${phoneNumber.replace('+', '')}&text=${message}`;
    const webLink = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl">Order Placed Successfully!</CardTitle>
              
              {/* Order Reference */}
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Order Reference</p>
                <p className="text-xl font-mono font-bold text-foreground">{orderRef}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Order Summary */}
              {orderItems.length > 0 && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    {orderItems.map((item: OrderItem) => (
                      <div key={item.product.id} className="flex justify-between">
                        <span>{item.product.name} × {item.quantity}</span>
                        <span>{formatPrice(item.product.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 font-semibold flex justify-between">
                      <span>Total</span>
                      <span>{formatPrice(orderData?.totalAmount || 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Instructions */}
              {storeConfig?.payment_details && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2 text-amber-900">💳 Payment Details</h3>
                  <pre className="whitespace-pre-wrap text-sm text-amber-800">{storeConfig.payment_details}</pre>
                </div>
              )}

              {/* What happens next */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-blue-900">📦 What happens next?</h3>
                <ol className="text-sm text-blue-800 space-y-2">
                  <li>1. Make your payment using the details above</li>
                  <li>2. We'll confirm your payment and process your order</li>
                  <li>3. You'll receive delivery updates</li>
                </ol>
              </div>

              {/* Primary Actions */}
              <div className="space-y-3">
                <Button className="w-full" size="lg" asChild>
                  <Link to="/track-order">
                    <Search className="mr-2 h-4 w-4" />
                    Track Your Order
                  </Link>
                </Button>
                
                <Button variant="outline" className="w-full" size="lg" asChild>
                  <Link to="/">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Continue Shopping
                  </Link>
                </Button>
              </div>

              {/* Need Help - Secondary */}
              <div className="pt-4 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    <HelpCircle className="h-4 w-4 inline mr-1" />
                    Need help with your order?
                  </p>
                  
                  <div className="text-left mb-4">
                    <Label htmlFor="customerRemark" className="mb-2 block text-sm">
                      Add a note for our team (optional)
                    </Label>
                    <Textarea
                      id="customerRemark"
                      placeholder="Special delivery instructions, questions, etc."
                      value={customerRemark}
                      onChange={(e) => setCustomerRemark(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  
                  {/* UPDATED: Changed from ghost button to bright primary button */}
                  <Button 
                    onClick={openWhatsApp}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0"
                    size="lg"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Send My Order To BIG SALES
                  </Button>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    This will open WhatsApp to send your order details
                  </p>
                </div>
              </div>

              {/* Leave Reviews - Tertiary */}
              {orderItems.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4" />
                    Enjoying your purchase? Leave a review!
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {orderItems.map((item: OrderItem) => (
                      <Button
                        key={item.product.id}
                        variant="secondary"
                        size="sm"
                        asChild
                      >
                        <Link to={`/product/${item.product.id}#reviews`}>
                          Review {item.product.name}
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default OrderSuccess;