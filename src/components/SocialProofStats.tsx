import { useEffect, useState, useRef } from 'react';
import { Users, ShoppingBag, Star, TruckIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const useCountUp = (end: number, duration: number = 2000, start: boolean = false) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);

  return count;
};

export const SocialProofStats = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Fetch real stats from Supabase
  const { data: statsData } = useQuery({
    queryKey: ['social-proof-stats'],
    queryFn: async () => {
      const [ordersRes, reviewsRes] = await Promise.all([
        supabase.from('orders').select('customer_email', { count: 'exact' }),
        supabase.from('reviews').select('rating'),
      ]);

      const totalOrders = ordersRes.count || 0;
      const uniqueCustomers = new Set(ordersRes.data?.map(o => o.customer_email) || []).size;
      
      const ratings = reviewsRes.data || [];
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10)
        : 49;

      return {
        customers: Math.max(uniqueCustomers, 1),
        orders: Math.max(totalOrders, 1),
        rating: avgRating,
        cities: 5,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const customers = useCountUp(statsData?.customers || 1, 2000, visible);
  const orders = useCountUp(statsData?.orders || 1, 2000, visible);
  const rating = useCountUp(statsData?.rating || 49, 2000, visible);
  const cities = useCountUp(statsData?.cities || 5, 1500, visible);

  const stats = [
    { icon: Users, value: `${customers.toLocaleString()}+`, label: 'Happy Customers', color: 'text-primary' },
    { icon: ShoppingBag, value: `${orders.toLocaleString()}+`, label: 'Orders Delivered', color: 'text-accent' },
    { icon: Star, value: `${(rating / 10).toFixed(1)}/5`, label: 'Average Rating', color: 'text-yellow-500' },
    { icon: TruckIcon, value: `${cities}+`, label: 'Cities Covered', color: 'text-secondary' },
  ];

  return (
    <section ref={ref} className="py-10 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
