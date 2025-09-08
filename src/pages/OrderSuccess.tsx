import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StoreConfig } from '@/types';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';

const OrderSuccess = () => {
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [orderDetails, setOrderDetails] = useState({
    customerName: 'Customer Name', // This would typically come from your order data
    customerPhone: 'Customer Phone', // This would typically come from your order data
    orderItems: [], // This would typically come from your order data
    totalAmount: 0, // This would typically come from your order data
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

  // Function to open WhatsApp with the pre-configured message (same as in Checkout)
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
    const orderSummary = orderDetails.orderItems.map(item => 
      `• ${item.product.name} x ${item.quantity} - ${formatPrice(item.product.price * item.quantity)}`
    ).join('%0A');

    const totalAmount = formatPrice(orderDetails.totalAmount);

    // Combine pre-configured message with order summary
    const baseMessage = storeConfig.whatsapp_message || 'Hello, I have completed my order and made payment. Here are my order details:';
    
    const fullMessage = `${baseMessage}%0A%0A` +
      `*Order Summary:*%0A` +
      `${orderSummary}%0A` +
      `*Total: ${totalAmount}*%0A%0A` +
      `*My Details:*%0A` +
      `Name: ${orderDetails.customerName || 'Not provided'}%0A` +
      `Phone: ${orderDetails.customerPhone || 'Not provided'}`;

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Order Placed Successfully!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-muted-foreground">
                Thank you for your order! We've received your order details and will process it shortly.
              </p>

              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-semibold mb-2">Next Steps:</h3>
                <ol className="text-left text-sm space-y-2">
                  <li>1. Make payment using the provided payment details</li>
                  <li>2. Contact us via WhatsApp with your payment proof</li>
                  <li>3. We'll confirm your order and begin processing</li>
                  <li>4. Your order will be shipped within 2-3 business days</li>
                </ol>
              </div>

              {storeConfig?.payment_details && (
                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-semibold mb-2">Payment Details:</h3>
                  <pre className="whitespace-pre-wrap text-sm">{storeConfig.payment_details}</pre>
                </div>
              )}

              <div className="space-y-3">
                <Button className="w-full" onClick={openWhatsApp}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact us on WhatsApp
                </Button>
                
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/">
                    Continue Shopping
                  </Link>
                </Button>
              </div>

              <div className="text-sm text-muted-foreground border-t pt-4">
                <p>
                  If you have any questions about your order, please don't hesitate to contact us 
                  through any of our social media channels.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default OrderSuccess;