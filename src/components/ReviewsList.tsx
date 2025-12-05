import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Review } from '@/types';
import { Star } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ReviewsListProps {
  productId: string;
}

export const ReviewsList = ({ productId }: ReviewsListProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Review[];
    },
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
        {reviews && reviews.length > 0 ? (
          reviews.map((review) => (
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
