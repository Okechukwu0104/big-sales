import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Minus, ShoppingCart } from 'lucide-react';
import { useCartContext } from '@/components/ui/cart-provider';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCartContext();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) throw new Error('Product ID is required');
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });

  const handleAddToCart = () => {
    if (!product) return;
    
    if (product.quantity < quantity) {
      return toast({
        title: "Quantity exceeding stock",
        description: `You requested ${quantity} items but we only have ${product.quantity} in stock.`,
        variant: "destructive"
      });
    }
    
    addToCart(product, quantity);
    toast({
      title: "Added to cart",
      description: `${quantity} x ${product.name} has been added to your cart.`,
    });
  };

  const increaseQuantity = () => {
    if (product && quantity < product.quantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="bg-slate-200 h-8 w-32 rounded mb-8"></div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-slate-200 aspect-square rounded-lg"></div>
              <div>
                <div className="bg-slate-200 h-8 rounded mb-4"></div>
                <div className="bg-slate-200 h-4 rounded mb-2"></div>
                <div className="bg-slate-200 h-4 rounded mb-4 w-3/4"></div>
                <div className="bg-slate-200 h-12 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
            <Link to="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Link 
          to="/" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8 transition-colors font-medium"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          <div className="aspect-square overflow-hidden rounded-xl shadow-lg bg-white p-4">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center">
                <span className="text-slate-400 text-lg">No image available</span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
                {product.featured && (
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Featured</Badge>
                )}
              </div>
              <p className="text-3xl font-bold text-blue-700">{formatPrice(product.price)}</p>
            </div>

            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${product.quantity > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-slate-700">
                {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
              </span>
            </div>

            {product.description && (
              <div>
                <h2 className="text-lg font-semibold mb-2 text-slate-900">Description</h2>
                <p className="text-slate-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 space-y-6">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium mb-2 text-slate-900">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                    className="h-10 w-10"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-medium w-10 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={increaseQuantity}
                    disabled={!product || quantity >= product.quantity}
                    className="h-10 w-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleAddToCart} 
                size="lg" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base"
                disabled={product.quantity === 0}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;