import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StoreConfig } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const OrderSuccess = () => {
  const { toast } = useToast();
  const [customerRemark, setCustomerRemark] = useState('');

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

    const message = 
      `*Additional Remarks:*%0A` +
      `${customerRemark || 'type something...'}`;

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
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Order Placed Successfully!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-muted-foreground">
                Thank you for your order! Please complete these final steps.
              </p>

              <div className="bg-muted p-4 rounded-md">
                <h3 className="font-semibold mb-2">Next Steps:</h3>
                <ol className="text-left text-sm space-y-2">
                  <li>1. Make your payment using the details below</li>
                  <li>2. Add any special instructions if needed</li>
                  <li>3. Contact us via WhatsApp with your payment proof</li>
                </ol>
              </div>

              {storeConfig?.payment_details && (
                <div className="bg-muted p-4 rounded-md">
                  <h3 className="font-semibold mb-2">Payment Details:</h3>
                  <pre className="whitespace-pre-wrap text-sm">{storeConfig.payment_details}</pre>
                </div>
              )}

              <div className="space-y-4">
                <div className="text-left">
                  <Label htmlFor="customerRemark" className="mb-2 block">
                    Special Instructions (Optional)
                  </Label>
                  <Textarea
                    id="customerRemark"
                    placeholder="Delivery preferences, special requests, or other information..."
                    value={customerRemark}
                    onChange={(e) => setCustomerRemark(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button className="w-full" onClick={openWhatsApp}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact via WhatsApp
                </Button>
                
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/">
                    Continue Shopping
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default OrderSuccess;