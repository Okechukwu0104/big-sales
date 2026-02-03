import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PromotionalBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  background_color: string | null;
  text_color: string | null;
  link_url: string | null;
  link_text: string | null;
  is_active: boolean;
  display_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export const PromoBannerCarousel = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const { data: banners, isLoading } = useQuery({
    queryKey: ['promotional-banners'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('promotional_banners')
        .select('*')
        .eq('is_active', true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gte.${now}`)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as PromotionalBanner[];
    },
  });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Auto-play functionality
  useEffect(() => {
    if (!emblaApi || isPaused || !banners || banners.length <= 1) return;

    const interval = setInterval(() => {
      emblaApi.scrollNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [emblaApi, isPaused, banners]);

  if (isLoading) {
    return (
      <div className="w-full">
        <Skeleton className="h-32 sm:h-40 md:h-48 w-full rounded-none" />
      </div>
    );
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <div 
      className="relative w-full group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="flex-[0_0_100%] min-w-0"
            >
              <div
                className="relative h-32 sm:h-40 md:h-48 flex items-center justify-center overflow-hidden"
                style={{
                  backgroundColor: banner.background_color || '#f97316',
                  backgroundImage: banner.image_url ? `url(${banner.image_url})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Overlay for better text readability */}
                {banner.image_url && (
                  <div className="absolute inset-0 bg-black/30" />
                )}
                
                <div className="relative z-10 text-center px-4 sm:px-8 max-w-4xl mx-auto">
                  <h2 
                    className="text-xl sm:text-2xl md:text-4xl font-bold mb-1 sm:mb-2"
                    style={{ color: banner.text_color || '#ffffff' }}
                  >
                    {banner.title}
                  </h2>
                  
                  {banner.subtitle && (
                    <p 
                      className="text-sm sm:text-base md:text-lg mb-2 sm:mb-4 opacity-90"
                      style={{ color: banner.text_color || '#ffffff' }}
                    >
                      {banner.subtitle}
                    </p>
                  )}
                  
                  {banner.link_url && banner.link_text && (
                    <a
                      href={banner.link_url}
                      className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-medium text-sm sm:text-base transition-all hover:scale-105 hover:shadow-lg"
                      style={{
                        backgroundColor: banner.text_color || '#ffffff',
                        color: banner.background_color || '#f97316',
                      }}
                    >
                      {banner.link_text}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full bg-white/80 text-gray-800 opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110 shadow-md"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 rounded-full bg-white/80 text-gray-800 opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110 shadow-md"
            aria-label="Next slide"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                "w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all",
                selectedIndex === index
                  ? "bg-white scale-125"
                  : "bg-white/50 hover:bg-white/75"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
