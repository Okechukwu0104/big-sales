import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product, Review } from '@/types';
import { useCartContext } from '@/components/ui/cart-provider';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Heart, Zap, TrendingUp, Eye, Play } from 'lucide-react';
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [guestLiked, setGuestLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  // Check guest likes from localStorage
  useEffect(() => {
    const guestLikes = JSON.parse(localStorage.getItem('guestLikes') || '[]');
    setGuestLiked(guestLikes.includes(product.id));
  }, [product.id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleVideoHover = useCallback(() => {
    if (!videoRef.current || !product.video_url) return;
    setIsHovering(true);
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => {});
    timeoutRef.current = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }, 10000);
  }, [product.video_url]);

  const handleVideoLeave = useCallback(() => {
    if (!videoRef.current) return;
    setIsHovering(false);
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

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
        const guestLikes = JSON.parse(localStorage.getItem('guestLikes') || '[]');
        const guestId = localStorage.getItem('guestId') || crypto.randomUUID();
        localStorage.setItem('guestId', guestId);
        
        if (guestLiked) {
          const updatedLikes = guestLikes.filter((id: string) => id !== product.id);
          localStorage.setItem('guestLikes', JSON.stringify(updatedLikes));
          setGuestLiked(false);
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

  const handleQuickBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    navigate('/checkout');
  };

  const currentlyLiked = user ? isLiked : guestLiked;

  const { data: reviews } = useQuery({
    queryKey: ['reviews', product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('product_id', product.id);
      if (error) throw error;
      return data as Pick<Review, 'rating'>[];
    },
  });

  const averageRating = reviews?.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const isLowStock = product.quantity !== undefined && product.quantity > 0 && product.quantity <= 5;
  const isPopular = product.likes_count >= 10;
  const isNew = new Date(product.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;
  const hasVideo = !!product.video_url;

  return (
    <Card className="group overflow-hidden card-modern hover-glow">
      <Link to={`/product/${product.id}`}>
        <div 
          className="aspect-square overflow-hidden relative"
          onMouseEnter={hasVideo ? handleVideoHover : undefined}
          onMouseLeave={hasVideo ? handleVideoLeave : undefined}
        >
          {/* Video or Image */}
          {hasVideo ? (
            <>
              <video
                ref={videoRef}
                src={product.video_url!}
                muted
                loop
                playsInline
                preload="metadata"
                poster={product.image_url || undefined}
                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
              />
              {/* Play icon overlay */}
              {!isHovering && (
                <div className="absolute bottom-2 right-2 bg-black/70 rounded-full p-1.5 sm:p-2">
                  <Play className="h-3 w-3 sm:h-4 sm:w-4 text-white fill-white" />
                </div>
              )}
            </>
          ) : product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              width={300}
              height={300}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
            />
          ) : (
            <div className="w-full h-full gradient-glass flex items-center justify-center">
              <span className="text-muted-foreground text-lg">No image</span>
            </div>
          )}

          {!product.in_stock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-bold text-sm sm:text-lg px-3 py-1.5 bg-destructive rounded-lg">
                Out of Stock
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Badges - top left */}
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1">
            {isNew && (
              <Badge className="badge-hot border-0 text-[10px] sm:text-xs px-1.5 py-0.5">
                🔥 NEW
              </Badge>
            )}
            {product.featured && (
              <Badge className="gradient-accent-button border-0 text-accent-foreground text-[10px] sm:text-xs px-1.5 py-0.5">
                <Star className="w-3 h-3 mr-0.5" />
                Featured
              </Badge>
            )}
            {isPopular && (
              <Badge className="bg-amber-500 text-white border-0 text-[10px] sm:text-xs px-1.5 py-0.5">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                Popular
              </Badge>
            )}
            {isLowStock && product.in_stock && (
              <Badge variant="destructive" className="animate-pulse text-[10px] sm:text-xs px-1.5 py-0.5">
                <Eye className="w-3 h-3 mr-0.5" />
                {product.quantity} left!
              </Badge>
            )}
          </div>
          
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLike}
              className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-white/90 hover:bg-white shadow-md"
              disabled={likeMutation.isPending}
            >
              <Heart 
                className={`h-4 w-4 ${currentlyLiked ? 'fill-red-500 text-red-500' : 'text-slate-600'}`}
              />
            </Button>
          </div>
        </div>
      </Link>
      
      <CardContent className="p-2.5 sm:p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-bold text-sm sm:text-base group-hover:text-primary transition-colors duration-300 line-clamp-1 mb-1">
            {product.name}
          </h3>
        </Link>
        
        {reviews && reviews.length > 0 && (
          <div className="flex items-center gap-0.5 mb-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3 h-3 ${
                  star <= Math.round(averageRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted'
                }`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-0.5">
              ({reviews.length})
            </span>
          </div>
        )}
        
        {product.description && (
          <p className="text-muted-foreground text-xs mb-2 line-clamp-1 leading-relaxed hidden sm:block">
            {product.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-base sm:text-lg font-extrabold naira-price">
              {formatPrice(product.price)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Heart className="h-3 w-3" />
            <span className="text-xs">{product.likes_count}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-2.5 sm:p-4 pt-0 flex gap-1.5">
        <Button 
          onClick={handleAddToCart} 
          className="flex-1 relative overflow-hidden text-xs sm:text-sm h-8 sm:h-9" 
          size="sm"
          disabled={!product.in_stock}
          variant="outline"
        >
          <ShoppingCart className="h-3.5 w-3.5 mr-1" />
          <span className="hidden sm:inline">{product.in_stock ? 'Add' : 'Out of Stock'}</span>
          <span className="sm:hidden">{product.in_stock ? '' : 'N/A'}</span>
        </Button>
        {product.in_stock && (
          <Button 
            onClick={handleQuickBuy}
            size="sm"
            className="relative overflow-hidden gradient-accent-button text-accent-foreground text-xs sm:text-sm h-8 sm:h-9"
          >
            <Zap className="h-3.5 w-3.5 mr-1" />
            <span>Buy</span>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
