import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ReviewFormProps {
  productId: string;
}

export const ReviewForm = ({ productId }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createReviewMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('reviews').insert({
        product_id: productId,
        user_id: user?.id || null,
        rating,
        review_text: reviewText.trim() || null,
        reviewer_name: reviewerName.trim(),
        reviewer_email: reviewerEmail.trim() || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Review submitted',
        description: 'Thank you for your feedback!',
      });
      setRating(0);
      setReviewText('');
      setReviewerName('');
      setReviewerEmail('');
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({
        title: 'Rating required',
        description: 'Please select a star rating.',
        variant: 'destructive',
      });
      return;
    }

    if (!reviewerName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter your name.',
        variant: 'destructive',
      });
      return;
    }

    createReviewMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-border rounded-lg p-6">
      <h3 className="text-xl font-semibold">Write a Review</h3>
      
      <div className="space-y-2">
        <Label>Rating *</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-colors"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reviewer-name">Name *</Label>
        <Input
          id="reviewer-name"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          placeholder="Your name"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reviewer-email">Email (optional)</Label>
        <Input
          id="reviewer-email"
          type="email"
          value={reviewerEmail}
          onChange={(e) => setReviewerEmail(e.target.value)}
          placeholder="your.email@example.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-text">Review (optional)</Label>
        <Textarea
          id="review-text"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your thoughts about this product..."
          rows={4}
        />
      </div>

      <Button type="submit" disabled={createReviewMutation.isPending}>
        {createReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
      </Button>
    </form>
  );
};
