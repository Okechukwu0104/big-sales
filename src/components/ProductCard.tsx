import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { useCartContext } from '@/components/ui/cart-provider';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useCartContext();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [guestLiked, setGuestLiked] = useState(false);

  // Check guest likes from localStorage
  useEffect(() => {
    const guestLikes = JSON.parse(localStorage.getItem('guestLikes') || '[]');
    setGuestLiked(guestLikes.includes(product.id));
  }, [product.id]);

  // Check if authenticated user has liked this product
  const { data: isLiked } = useQuery({
    queryKey: ['product-like', product.id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('product_likes')
        .select('id')
        .eq('product_id', product.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (user) {
        // Authenticated user
        if (isLiked) {
          const { error } = await supabase
            .from('product_likes')
            .delete()
            .eq('product_id', product.id)
            .eq('user_id', user.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('product_likes')
            .insert({ product_id: product.id, user_id: user.id });
          
          if (error) throw error;
        }
      } else {
        // Guest user - use localStorage
        const guestLikes = JSON.parse(localStorage.getItem('guestLikes') || '[]');
        const guestId = localStorage.getItem('guestId') || crypto.randomUUID();
        localStorage.setItem('guestId', guestId);
        
        if (guestLiked) {
          const updatedLikes = guestLikes.filter((id: string) => id !== product.id);
          localStorage.setItem('guestLikes', JSON.stringify(updatedLikes));
          setGuestLiked(false);
          
          // Remove from database
          const { error } = await supabase
            .from('product_likes')
            .delete()
            .eq('product_id', product.id)
            .eq('user_id', guestId);
          
          if (error) throw error;
        } else {
          guestLikes.push(product.id);
          localStorage.setItem('guestLikes', JSON.stringify(guestLikes));
          setGuestLiked(true);
          
          // Add to database
          const { error } = await supabase
            .from('product_likes')
            .insert({ product_id: product.id, user_id: guestId });
          
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      queryClient.invalidateQueries({ queryKey: ['product-like', product.id, user?.id] });
      
      const currentlyLiked = user ? isLiked : guestLiked;
      toast({
        title: currentlyLiked ? "Added to favorites" : "Removed from favorites",
        description: currentlyLiked ? "Product liked successfully" : "Product unliked successfully",
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

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    likeMutation.mutate();
  };

  const handleAddToCart = () => {
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  const currentlyLiked = user ? isLiked : guestLiked;

  return (
    <Card className="group overflow-hidden card-modern hover-glow">
      <Link to={`/product/${product.id}`}>
        <div className="aspect-square overflow-hidden relative">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
            />
          ) : (
            <div className="w-full h-full gradient-glass flex items-center justify-center">
              <span className="text-muted-foreground text-lg">No image</span>
            </div>
          )}
          {!product.in_stock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-lg px-4 py-2 bg-destructive rounded-lg">
                Out of Stock
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          {product.featured && (
            <div className="absolute top-4 left-4">
              <Badge className="gradient-accent-button border-0 text-accent-foreground">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            </div>
          )}
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLike}
              className="h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
              disabled={likeMutation.isPending}
            >
              <Heart 
                className={`h-5 w-5 ${currentlyLiked ? 'fill-red-500 text-red-500' : 'text-slate-600'}`}
              />
            </Button>
          </div>
        </div>
      </Link>
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <Link to={`/product/${product.id}`}>
            <h3 className="font-bold text-xl group-hover:text-primary transition-colors duration-300 line-clamp-1">
              {product.name}
            </h3>
          </Link>
        </div>
        
        {product.description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold hero-text">
              {formatPrice(product.price)}
            </span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span className="text-sm font-medium">{product.likes_count}</span>
            </div>
          </div>
          {product.quantity !== undefined && product.quantity > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {product.quantity} left
            </span>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-6 pt-0">
        <Button 
          onClick={handleAddToCart} 
          className="w-full relative overflow-hidden" 
          size="lg"
          disabled={!product.in_stock}
          variant={product.in_stock ? "default" : "outline"}
        >
          <div className="shimmer absolute inset-0"></div>
          <ShoppingCart className="h-4 w-4 mr-2 relative z-10" />
          <span className="relative z-10">{product.in_stock ? 'Add to Cart' : 'Out of Stock'}</span>
        </Button>
      </CardFooter>
    </Card>
  );
};