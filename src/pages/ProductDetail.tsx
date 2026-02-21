import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Minus, ShoppingCart, Heart, Zap } from 'lucide-react';
import { useCartContext } from '@/components/ui/cart-provider';
import { useCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ReviewsList } from '@/components/ReviewsList';
import { ReviewForm } from '@/components/ReviewForm';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCartContext();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [descExpanded, setDescExpanded] = useState(false);
  const { addToRecentlyViewed } = useRecentlyViewed();

  // Track product view
  useEffect(() => {
    if (id) {
      addToRecentlyViewed(id);
    }
  }, [id, addToRecentlyViewed]);

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

  const { data: isLiked } = useQuery({
    queryKey: ['product-like', id, user?.id],
    queryFn: async () => {
      if (!id || !user) return false;
      
      const { data, error } = await supabase
        .from('product_likes')
        .select('id')
        .eq('product_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!id && !!user,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!id || !user) throw new Error('Must be logged in');
      
      if (isLiked) {
        const { error } = await supabase
          .from('product_likes')
          .delete()
          .eq('product_id', id)
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_likes')
          .insert({ product_id: id, user_id: user.id });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['product-like', id, user?.id] });
      toast({
        title: isLiked ? "Removed from favorites" : "Added to favorites",
        description: isLiked ? "Product unliked successfully" : "Product liked successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update like status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLike = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to like products",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate();
  };

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

  const handleBuyNow = () => {
    if (!product) return;
    
    if (product.quantity < quantity) {
      return toast({
        title: "Quantity exceeding stock",
        description: `You requested ${quantity} items but we only have ${product.quantity} in stock.`,
        variant: "destructive"
      });
    }
    
    addToCart(product, quantity);
    navigate('/checkout');
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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 pt-24">
          <div className="animate-pulse">
            <div className="bg-muted h-8 w-32 rounded mb-8"></div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-muted aspect-square rounded-lg"></div>
              <div>
                <div className="bg-muted h-8 rounded mb-4"></div>
                <div className="bg-muted h-4 rounded mb-2"></div>
                <div className="bg-muted h-4 rounded mb-4 w-3/4"></div>
                <div className="bg-muted h-12 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 pt-24">
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-20">
        <Link 
          to="/" 
          className="inline-flex items-center text-primary hover:text-primary/80 mb-6 sm:mb-8 transition-colors font-medium"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Link>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-xl shadow-lg bg-card p-2 sm:p-4">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  loading="lazy"
                  width={600}
                  height={600}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground text-lg">No image available</span>
                </div>
              )}
            </div>
            
            {product.video_url && (
              <div className="rounded-xl overflow-hidden shadow-lg bg-card">
                <video
                  src={product.video_url}
                  controls
                  preload="metadata"
                  poster={product.image_url || undefined}
                  className="w-full rounded-xl"
                  playsInline
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{product.name}</h1>
                  {product.featured && (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Featured</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLike}
                  className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0"
                  disabled={likeMutation.isPending}
                >
                  <Heart 
                    className={`h-5 w-5 sm:h-6 sm:w-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                  />
                </Button>
              </div>
              <div className="flex items-center gap-4 mb-2 flex-wrap">
                <p className="text-2xl sm:text-3xl font-bold text-primary">{formatPrice(product.price)}</p>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Heart className="h-4 w-4" />
                  <span className="text-sm">{product.likes_count} likes</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${product.quantity > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-foreground">
                {product.quantity > 0 ? `${product.quantity} in stock` : 'Out of stock'}
              </span>
              {product.quantity > 0 && product.quantity <= 5 && (
                <Badge variant="destructive" className="text-xs">Only {product.quantity} left!</Badge>
              )}
            </div>

            {product.description && (
              <div>
                <h2 className="text-lg font-semibold mb-2 text-foreground">Description</h2>
                <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                  {descExpanded || product.description.length <= 150
                    ? product.description
                    : `${product.description.slice(0, 150)}...`}
                </p>
                {product.description.length > 150 && (
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="text-primary text-sm font-medium mt-1 hover:underline"
                  >
                    {descExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-border space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium mb-2 text-foreground">
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

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleAddToCart} 
                  size="lg" 
                  variant="outline"
                  className="flex-1 py-3 text-base"
                  disabled={product.quantity === 0}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart
                </Button>
                <Button 
                  onClick={handleBuyNow} 
                  size="lg" 
                  className="flex-1 py-3 text-base relative overflow-hidden group"
                  disabled={product.quantity === 0}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></span>
                  <Zap className="mr-2 h-5 w-5" />
                  Buy Now
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12 sm:mt-16 space-y-6 sm:space-y-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Customer Reviews</h2>
          
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <ReviewsList productId={id!} />
            </div>
            <div>
              <ReviewForm productId={id!} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;
