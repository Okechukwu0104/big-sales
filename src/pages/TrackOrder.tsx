import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order } from '@/types';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
  new: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  processing: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  shipped: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
};

const statusIcons = {
  new: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
};

const TrackOrder = () => {
  const [searchValue, setSearchValue] = useState('');
  const [searchSubmitted, setSearchSubmitted] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['track-order', searchValue],
    queryFn: async () => {
      if (!searchValue.trim()) return null;

      // Try to find order by ID or email
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`id.eq.${searchValue},customer_email.ilike.%${searchValue}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data ? { ...data, order_items: data.order_items as any } as Order : null;
    },
    enabled: searchSubmitted && !!searchValue.trim(),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchSubmitted(true);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  const StatusIcon = order ? statusIcons[order.status] : Clock;

  return (
    <div className="min-h-screen gradient-hero">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-3">Track Your Order</h1>
            <p className="text-muted-foreground text-lg">
              Enter your order ID or email address to check your order status
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Order ID or Email Address"
                    value={searchValue}
                    onChange={(e) => {
                      setSearchValue(e.target.value);
                      setSearchSubmitted(false);
                    }}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" disabled={!searchValue.trim()}>
                  Track Order
                </Button>
              </form>
            </CardContent>
          </Card>

          {isLoading && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Searching for your order...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="py-8">
                <div className="text-center text-destructive">
                  <p className="font-medium">Error loading order</p>
                  <p className="text-sm mt-1">Please try again later</p>
                </div>
              </CardContent>
            </Card>
          )}

          {searchSubmitted && !isLoading && !error && !order && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-xl font-medium mb-2">No Order Found</p>
                  <p className="text-muted-foreground">
                    We couldn't find an order matching your search. Please check your order ID or email address.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {order && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
                      <CardDescription>Placed on {formatDate(order.created_at)}</CardDescription>
                    </div>
                    <Badge className={`${statusColors[order.status]} border px-4 py-2`}>
                      <StatusIcon className="h-4 w-4 mr-2" />
                      {order.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Order Progress</h3>
                      <div className="flex items-center justify-between gap-2">
                        {(['new', 'processing', 'shipped', 'delivered'] as const).map((status, index) => {
                          const Icon = statusIcons[status];
                          const isActive = ['new', 'processing', 'shipped', 'delivered'].indexOf(order.status) >= index;
                          const isCurrent = order.status === status;
                          
                          return (
                            <div key={status} className="flex-1 flex flex-col items-center">
                              <div className={`rounded-full p-3 mb-2 ${
                                isActive 
                                  ? isCurrent 
                                    ? 'bg-primary text-primary-foreground' 
                                    : 'bg-primary/20 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              }`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <span className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{order.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{order.customer_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{order.customer_phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shipping Address</p>
                    <p className="font-medium">{order.shipping_address}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.order_items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-4 pb-4 border-b last:border-0">
                        {item.product.image_url && (
                          <img 
                            src={item.product.image_url} 
                            alt={item.product.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-semibold">
                          ₦{(item.product.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="text-lg font-semibold">Total Amount</span>
                      <span className="text-2xl font-bold text-primary">
                        ₦{order.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TrackOrder;
