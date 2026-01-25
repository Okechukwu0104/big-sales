import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Star, BadgeCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ReviewsListProps {
  productId: string;
}

// Public review type from the reviews_public view (no email exposed)
interface PublicReview {
  id: string;
  product_id: string;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
  images: string[] | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  is_verified_purchase: boolean;
}

export const ReviewsList = ({ productId }: ReviewsListProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Use the reviews_public view which excludes email and includes verified status server-side
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews_public')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PublicReview[];
    },
  });

  // Sort reviews: verified purchases first, then by date
  const sortedReviews = reviews?.slice().sort((a, b) => {
    if (a.is_verified_purchase && !b.is_verified_purchase) return -1;
    if (!a.is_verified_purchase && b.is_verified_purchase) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const averageRating = reviews?.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  if (isLoading) {
    return <div className="text-muted-foreground">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      {reviews && reviews.length > 0 && (
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(averageRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-lg font-semibold">
            {averageRating.toFixed(1)} out of 5
          </span>
          <span className="text-muted-foreground">
            ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
          </span>
        </div>
      )}

      <div className="space-y-4">
        {sortedReviews && sortedReviews.length > 0 ? (
          sortedReviews.map((review) => (
            <div key={review.id} className="border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex">
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
                  <span className="font-semibold">{review.reviewer_name}</span>
                  {review.is_verified_purchase && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      <BadgeCheck className="w-3 h-3" />
                      Verified Purchase
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(review.created_at), 'MMM d, yyyy')}
                </span>
              </div>
              {review.review_text && (
                <p className="text-foreground">{review.review_text}</p>
              )}
              {review.images && review.images.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {review.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Review photo ${index + 1}`}
                      loading="lazy"
                      width={80}
                      height={80}
                      className="w-20 h-20 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedImage(image)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No reviews yet. Be the first to review this product!
          </p>
        )}
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-2">
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Review photo"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
