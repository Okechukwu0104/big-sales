import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { useCartContext } from '@/components/ui/cart-provider';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useCartContext();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();

  const handleAddToCart = () => {
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

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
            <div className="absolute top-4 right-4">
              <Badge className="gradient-accent-button border-0 text-accent-foreground">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            </div>
          )}
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
          <span className="text-3xl font-bold hero-text">
            {formatPrice(product.price)}
          </span>
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
          className="w-full shimmer" 
          size="lg"
          disabled={!product.in_stock}
          variant={product.in_stock ? "default" : "outline"}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {product.in_stock ? 'Add to Cart' : 'Out of Stock'}
        </Button>
      </CardFooter>
    </Card>
  );
};