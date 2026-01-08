// Updated HelpButton component
const HelpButton = () => {
  if (!whatsappLinks) return null;

  const handleWhatsAppClick = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // For mobile devices, try deep link first
    if (isMobile) {
      // Create a temporary iframe for iOS to handle the protocol
      if (isIOS) {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = whatsappLinks.deepLink;
        document.body.appendChild(iframe);
        
        // Fallback after delay if WhatsApp app didn't open
        setTimeout(() => {
          document.body.removeChild(iframe);
          
          // Check if we're still on the same page
          if (!document.hidden) {
            // Try web.whatsapp.com for mobile browsers
            const webLink = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
            window.open(webLink, '_blank');
          }
        }, 2000);
      } else {
        // For Android, direct deep link attempt
        window.location.href = whatsappLinks.deepLink;
        
        // Fallback after delay
        setTimeout(() => {
          // If we're still on the page, open web version
          if (document.visibilityState === 'visible') {
            const webLink = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
            window.open(webLink, '_blank');
          }
        }, 1000);
      }
    } else {
      // For desktop, always use web.whatsapp.com
      const webLink = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
      window.open(webLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleWhatsAppClick}
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Need help? Contact support"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Need help?</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Also update the generateWhatsAppLinks function to be more robust:
const generateWhatsAppLinks = () => {
  if (!storeConfig?.whatsapp_number) return null;
  
  const cleaned = storeConfig.whatsapp_number.replace(/[^\d+]/g, '');
  const phoneNumber = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  const encodedMessage = encodeURIComponent('Hi, I need help with my order');
  
  // Return phone number and encoded message for flexible link generation
  return { phoneNumber, encodedMessage };
};

// Usage in the component
const whatsappLinks = generateWhatsAppLinks();

// Alternative: Simplified version with better user experience
const SimplifiedHelpButton = () => {
  if (!whatsappLinks) return null;

  const handleWhatsAppClick = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const { phoneNumber, encodedMessage } = whatsappLinks;
    
    if (isMobile) {
      // Try to open WhatsApp app directly
      const deepLink = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;
      window.location.href = deepLink;
      
      // If WhatsApp is not installed, this will fail and we'll fall back to web
      setTimeout(() => {
        // Check if page is still visible (meaning deep link failed)
        if (!document.hidden) {
          // Open WhatsApp Web
          const webLink = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
          window.open(webLink, '_blank');
        }
      }, 2000);
    } else {
      // Desktop - always use WhatsApp Web
      const webLink = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
      window.open(webLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleWhatsAppClick}
      className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
      aria-label="Need help? Contact support"
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  );
};

// For the most reliable solution, consider using a library like whatsapp-chat-link:
// npm install whatsapp-chat-link
// Then you could do:
/*
import { getWhatsAppLink } from 'whatsapp-chat-link';

const handleWhatsAppClick = () => {
  const link = getWhatsAppLink({
    phone: whatsappLinks.phoneNumber,
    text: 'Hi, I need help with my order',
    web: true // Automatically detects and uses web version when needed
  });
  window.open(link, '_blank');
};
*/