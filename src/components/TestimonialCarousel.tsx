import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Star, Quote, BadgeCheck } from 'lucide-react';
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
    <section className="py-10 bg-gradient-to-br from-accent/5 via-background to-primary/5">
      <div className="container mx-auto px-4">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-2 text-foreground">What Our Customers Say</h2>
        <p className="text-center text-muted-foreground mb-6 text-sm">Real reviews from happy customers</p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((review) => (
            <Card key={review.id} className="bg-card/80 backdrop-blur-sm border-border">
              <CardContent className="p-4 sm:p-5">
                <Quote className="h-6 w-6 text-primary/20 mb-2" />
                
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted'
                      }`}
                    />
                  ))}
                </div>
                
                <p className="text-foreground mb-3 line-clamp-3 text-sm">
                  "{review.review_text}"
                </p>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-accent">
                      {review.reviewer_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{review.reviewer_name}</p>
                    <div className="flex items-center gap-1">
                      <BadgeCheck className="h-3 w-3 text-accent" />
                      <p className="text-xs text-accent font-medium">Verified Purchase</p>
                    </div>
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
