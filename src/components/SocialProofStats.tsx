import { useEffect, useState, useRef } from 'react';
import { Users, ShoppingBag, Star, TruckIcon } from 'lucide-react';

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

  const customers = useCountUp(2500, 2000, visible);
  const orders = useCountUp(5000, 2000, visible);
  const rating = useCountUp(49, 2000, visible);
  const cities = useCountUp(36, 1500, visible);

  const stats = [
    { icon: Users, value: `${customers.toLocaleString()}+`, label: 'Happy Customers', color: 'text-primary' },
    { icon: ShoppingBag, value: `${orders.toLocaleString()}+`, label: 'Orders Delivered', color: 'text-primary' },
    { icon: Star, value: `${(rating / 10).toFixed(1)}/5`, label: 'Average Rating', color: 'text-primary' },
    { icon: TruckIcon, value: `${cities}+`, label: 'Cities Covered', color: 'text-primary' },
  ];

  return (
    <section ref={ref} className="py-12 relative overflow-hidden pattern-bg">
      <div className="absolute inset-0 bg-secondary/90" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/20 mb-4`}>
                <stat.icon className={`h-7 w-7 ${stat.color}`} />
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white">{stat.value}</div>
              <div className="text-sm text-white/60 mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
