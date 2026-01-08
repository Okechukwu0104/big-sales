import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  product_id: string;
}

export const TestimonialCarousel = () => {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['top-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, reviewer_name, rating, review_text, created_at, product_id')
        .gte('rating', 4)
        .not('review_text', 'is', null)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (error) throw error;
      return data as Review[];
    },
  });

  if (isLoading || !reviews || reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gradient-to-br from-primary/5 to-amber-50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-2 text-foreground">What Our Customers Say</h2>
        <p className="text-center text-muted-foreground mb-8">Real reviews from happy customers</p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <Card key={review.id} className="bg-white/80 backdrop-blur-sm border-border">
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary/20 mb-3" />
                
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                
                <p className="text-foreground mb-4 line-clamp-3">
                  "{review.review_text}"
                </p>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {review.reviewer_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{review.reviewer_name}</p>
                    <p className="text-xs text-muted-foreground">Verified Buyer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
