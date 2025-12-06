import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, LogOut, Star, Trash2, BadgeCheck, Search } from 'lucide-react';
import { format } from 'date-fns';

interface ReviewWithProduct {
  id: string;
  product_id: string;
  reviewer_name: string;
  reviewer_email: string | null;
  rating: number;
  review_text: string | null;
  images: string[] | null;
  created_at: string;
  product_name?: string;
  is_verified?: boolean;
}

interface OrderItem {
  id: string;
}

const AdminReviews = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all');

  // Fetch all reviews with product names
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      // Fetch product names
      const productIds = [...new Set(reviewsData.map(r => r.product_id))];
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);

      if (productsError) throw productsError;

      const productMap = new Map(products?.map(p => [p.id, p.name]));

      // Fetch orders to check verified purchases
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('customer_email, order_items');

      if (ordersError) throw ordersError;

      // Build verified emails per product
      const verifiedMap = new Map<string, Set<string>>();
      orders?.forEach(order => {
        const items = order.order_items as unknown as OrderItem[];
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (!verifiedMap.has(item.id)) {
              verifiedMap.set(item.id, new Set());
            }
            verifiedMap.get(item.id)!.add(order.customer_email.toLowerCase());
          });
        }
      });

      return reviewsData.map(review => ({
        ...review,
        product_name: productMap.get(review.product_id) || 'Unknown Product',
        is_verified: review.reviewer_email 
          ? verifiedMap.get(review.product_id)?.has(review.reviewer_email.toLowerCase()) || false
          : false,
      })) as ReviewWithProduct[];
    },
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast({
        title: 'Review deleted',
        description: 'The review has been removed successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete the review.',
        variant: 'destructive',
      });
    },
  });

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (!error) {
      toast({ title: 'Signed out successfully' });
    }
  };

  // Filter reviews
  const filteredReviews = reviews?.filter(review => {
    const matchesSearch = 
      review.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.reviewer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.review_text?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRating = ratingFilter === 'all' || review.rating === parseInt(ratingFilter);
    const matchesVerified = 
      verifiedFilter === 'all' || 
      (verifiedFilter === 'verified' && review.is_verified) ||
      (verifiedFilter === 'unverified' && !review.is_verified);

    return matchesSearch && matchesRating && matchesVerified;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <h1 className="text-2xl font-bold glow-text gradient-primary bg-clip-text text-transparent">
                Reviews Management
              </h1>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>All Reviews ({filteredReviews?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product, reviewer, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
              <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Verified Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reviews</SelectItem>
                  <SelectItem value="verified">Verified Only</SelectItem>
                  <SelectItem value="unverified">Unverified Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading reviews...</div>
            ) : filteredReviews && filteredReviews.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Reviewer</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="max-w-[300px]">Review</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReviews.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          <Link 
                            to={`/product/${review.product_id}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {review.product_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{review.reviewer_name}</p>
                            {review.reviewer_email && (
                              <p className="text-xs text-muted-foreground">{review.reviewer_email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="truncate text-sm">
                            {review.review_text || <span className="text-muted-foreground italic">No text</span>}
                          </p>
                          {review.images && review.images.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {review.images.length} photo(s)
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(review.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {review.is_verified ? (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <BadgeCheck className="w-3 h-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="w-fit">Unverified</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Review</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this review by {review.reviewer_name}? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteReviewMutation.mutate(review.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No reviews found matching your filters.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminReviews;
