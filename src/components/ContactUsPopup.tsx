import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StoreConfig } from '@/types';
import { MessageCircle, X, Package, Truck, HelpCircle, Send } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const QUICK_MESSAGES = [
  {
    id: 'product',
    icon: Package,
    label: 'Question about a product',
    message: "Hi! I have a question about one of your products.",
  },
  {
    id: 'order',
    icon: Truck,
    label: 'Help with my order',
    message: "Hi! I need help with my order.",
  },
  {
    id: 'general',
    icon: HelpCircle,
    label: 'General inquiry',
    message: "Hi! I have a general inquiry.",
  },
];

export const ContactUsPopup = () => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [selectedQuickMessage, setSelectedQuickMessage] = useState<string | null>(null);

  const { data: storeConfig } = useQuery({
    queryKey: ['store-config-contact'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_config')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as StoreConfig | null;
    },
  });

  const sendViaWhatsApp = (message: string) => {
    if (!storeConfig?.whatsapp_number) {
      toast({
        title: "WhatsApp not configured",
        description: "The store owner hasn't set up WhatsApp yet. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    const phoneNumber = storeConfig.whatsapp_number.replace(/[^0-9+]/g, '');
    const encodedMessage = encodeURIComponent(message);
    const deepLink = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;
    const webLink = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;

    // Try deep link first
    const link = document.createElement('a');
    link.href = deepLink;
    link.click();

    // Fallback to web link after a short delay
    setTimeout(() => {
      window.open(webLink, '_blank');
    }, 500);

    setIsOpen(false);
    setCustomMessage('');
    setSelectedQuickMessage(null);
  };

  const handleQuickMessage = (messageId: string, message: string) => {
    setSelectedQuickMessage(messageId);
    sendViaWhatsApp(message);
  };

  const handleCustomMessage = () => {
    if (!customMessage.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message before sending.",
        variant: "destructive",
      });
      return;
    }
    sendViaWhatsApp(customMessage);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className="fixed bottom-24 right-4 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 hover:scale-110 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
          aria-label="Contact us via WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-green-100 rounded-xl">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </div>
            Contact Us
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              How can we help you?
            </h3>

            <div className="space-y-2">
              {QUICK_MESSAGES.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleQuickMessage(item.id, item.message)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-md",
                      selectedQuickMessage === item.id
                        ? "border-green-500 bg-green-50"
                        : "border-border bg-card hover:border-green-300 hover:bg-green-50/50"
                    )}
                  >
                    <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                      <Icon className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="font-medium text-foreground">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or type your message
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Textarea
              placeholder="Type your message here..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[100px] resize-none"
            />

            <Button
              onClick={handleCustomMessage}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={!customMessage.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Send via WhatsApp
            </Button>
          </div>

          {!storeConfig?.whatsapp_number && (
            <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              ⚠️ WhatsApp is not configured for this store yet.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
