import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  containerClassName?: string;
  width?: number;
  height?: number;
  eager?: boolean;
  fallback?: React.ReactNode;
}

export const OptimizedImage = ({
  src,
  alt,
  className,
  containerClassName,
  width,
  height,
  eager = false,
  fallback,
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return fallback || (
      <div className={cn("bg-muted flex items-center justify-center", containerClassName, className)}>
        <span className="text-muted-foreground text-sm">No image</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      {!isLoaded && <Skeleton className="absolute inset-0" />}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        width={width}
        height={height}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </div>
  );
};
