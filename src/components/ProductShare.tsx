import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, Download, Copy, Check, MessageCircle, Facebook, Twitter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';
import QRCode from 'qrcode';

interface ProductShareProps {
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string | null;
  discountPrice?: number | null;
  variant?: 'icon' | 'button';
  className?: string;
}

export const ProductShare = ({
  productId,
  productName,
  productPrice,
  productImage,
  discountPrice,
  variant = 'icon',
  className = '',
}: ProductShareProps) => {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stickerReady, setStickerReady] = useState(false);

  const productUrl = `${window.location.origin}/product/${productId}`;
  // Now that Vercel intercepts bot traffic dynamically via routing rules,
  // we can simply use the direct product URL for sharing!
  const shareUrl = productUrl;
  const displayPrice = discountPrice ?? productPrice;
  const shareText = `Check out ${productName} for ${formatPrice(displayPrice)} on BIG SALES!`;

  const generateSticker = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 600;
    const h = 800;
    canvas.width = w;
    canvas.height = h;

    // Draw brown patterned background
    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    
    const drawSticker = async (bgLoaded: boolean) => {
      if (bgLoaded) {
        ctx.drawImage(bgImg, 0, 0, w, h);
        // Overlay for readability
        ctx.fillStyle = 'rgba(62, 39, 18, 0.65)';
        ctx.fillRect(0, 0, w, h);
      } else {
        // Fallback gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#5D3A1A');
        grad.addColorStop(0.5, '#8B5E3C');
        grad.addColorStop(1, '#3E2712');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Decorative border
      ctx.strokeStyle = 'rgba(255, 215, 140, 0.6)';
      ctx.lineWidth = 3;
      const br = 20;
      ctx.beginPath();
      ctx.roundRect(15, 15, w - 30, h - 30, br);
      ctx.stroke();

      // Inner glow border
      ctx.strokeStyle = 'rgba(255, 215, 140, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(22, 22, w - 44, h - 44, br - 4);
      ctx.stroke();

      // Logo text
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD78C';
      ctx.font = 'bold 38px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('🏷️  BIG SALES', w / 2, 75);

      // Divider line
      ctx.strokeStyle = 'rgba(255, 215, 140, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, 100);
      ctx.lineTo(w - 80, 100);
      ctx.stroke();

      // Generate QR code
      try {
        const qrDataUrl = await QRCode.toDataURL(productUrl, {
          width: 280,
          margin: 2,
          color: { dark: '#3E2712', light: '#FFFFFF' },
          errorCorrectionLevel: 'M',
        });

        const qrImg = new Image();
        await new Promise<void>((resolve) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = () => resolve();
          qrImg.src = qrDataUrl;
        });

        // QR background card
        const qrSize = 280;
        const qrX = (w - qrSize - 30) / 2;
        const qrY = 125;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(qrX, qrY, qrSize + 30, qrSize + 30, 16);
        ctx.fill();

        // Shadow effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 4;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.drawImage(qrImg, qrX + 15, qrY + 15, qrSize, qrSize);
      } catch (e) {
        console.error('QR generation failed', e);
      }

      // Product name
      const nameY = 470;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
      
      // Word wrap product name
      const maxWidth = w - 100;
      const words = productName.split(' ');
      let line = '';
      let lineY = nameY;
      const lines: string[] = [];
      
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      }
      lines.push(line);
      
      // Only show max 2 lines
      const displayLines = lines.slice(0, 2);
      if (lines.length > 2) displayLines[1] = displayLines[1] + '...';
      
      for (const l of displayLines) {
        ctx.fillText(l, w / 2, lineY);
        lineY += 34;
      }

      // Price
      const priceY = lineY + 15;
      ctx.fillStyle = '#FFD78C';
      ctx.font = 'bold 42px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(formatPrice(displayPrice), w / 2, priceY);

      // Discount badge
      if (discountPrice && discountPrice < productPrice) {
        const pct = Math.round((1 - discountPrice / productPrice) * 100);
        ctx.fillStyle = '#FF4444';
        const badgeW = 120;
        const badgeH = 32;
        const badgeX = w / 2 + ctx.measureText(formatPrice(displayPrice)).width / 2 + 10;
        const badgeY = priceY - 25;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
        ctx.fillText(`${pct}% OFF`, badgeX + badgeW / 2, badgeY + 22);
      }

      // CTA text
      const ctaY = priceY + 60;
      ctx.fillStyle = '#FFD78C';
      ctx.font = '22px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('✨  Scan to Shop Now!  ✨', w / 2, ctaY);

      // Bottom decorative line
      ctx.strokeStyle = 'rgba(255, 215, 140, 0.4)';
      ctx.beginPath();
      ctx.moveTo(80, h - 60);
      ctx.lineTo(w - 80, h - 60);
      ctx.stroke();

      // Website
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '16px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('big-sales.lovable.app', w / 2, h - 35);

      setStickerReady(true);
    };

    bgImg.onload = () => drawSticker(true);
    bgImg.onerror = () => drawSticker(false);
    bgImg.src = '/images/bg-pattern.avif';
  }, [productUrl, productName, displayPrice, formatPrice, discountPrice, productPrice]);

  useEffect(() => {
    if (open) {
      setStickerReady(false);
      // Small delay to ensure canvas is mounted
      const t = setTimeout(generateSticker, 100);
      return () => clearTimeout(t);
    }
  }, [open, generateSticker]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${productName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-qr-sticker.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast({ title: 'Sticker downloaded!', description: 'Share it anywhere.' });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: 'Link copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, text: shareText, url: shareUrl });
      } catch {}
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'icon' ? (
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-white/90 hover:bg-white shadow-md ${className}`}
            onClick={(e) => { e.stopPropagation(); }}
          >
            <Share2 className="h-4 w-4 text-slate-600" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 ${className}`}
            onClick={(e) => { e.stopPropagation(); }}
          >
            <Share2 className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Share Product</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* QR Sticker Preview */}
          <div className="flex flex-col items-center gap-3">
            <canvas
              ref={canvasRef}
              className="w-full max-w-[300px] rounded-xl shadow-lg border border-border"
              style={{ aspectRatio: '3/4' }}
            />
            <Button
              onClick={handleDownload}
              disabled={!stickerReady}
              className="w-full max-w-[300px]"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Sticker
            </Button>
          </div>

          {/* Social Share Links */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Share via</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => window.open(whatsappUrl, '_blank')}
              >
                <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => window.open(facebookUrl, '_blank')}
              >
                <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                Facebook
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => window.open(twitterUrl, '_blank')}
              >
                <Twitter className="h-4 w-4 mr-2" />
                X / Twitter
              </Button>
              {typeof navigator.share === 'function' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={handleNativeShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  More...
                </Button>
              )}
            </div>
          </div>

          {/* Copy Link */}
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={handleCopyLink}
          >
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
