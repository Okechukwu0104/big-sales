import { CartItem } from '@/types';

export const generateWhatsAppLink = (
  whatsappNumber: string,
  cartItems: CartItem[],
  customerInfo?: {
    name: string;
    email: string;
    phone: string;
    address: string;
  }
) => {
  if (!whatsappNumber) return '';
  
  let message = '';
  
  if (cartItems.length > 0) {
    message = `Hello! I'd like to place an order:\n\n`;
    
    cartItems.forEach((item, index) => {
      message += `${index + 1}. ${item.product.name} - Qty: ${item.quantity} - $${(item.product.price * item.quantity).toFixed(2)}\n`;
    });
    
    const total = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    message += `\nTotal: $${total.toFixed(2)}`;
    
    if (customerInfo) {
      message += `\n\nCustomer Details:\nName: ${customerInfo.name}\nEmail: ${customerInfo.email}\nPhone: ${customerInfo.phone}\nAddress: ${customerInfo.address}`;
    }
  } else {
    message = 'Hello! I have a question about your products.';
  }
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
};

export const generateSocialLink = (platform: string, link: string) => {
  if (!link) return '';
  
  // Ensure the link starts with http:// or https://
  if (!link.startsWith('http://') && !link.startsWith('https://')) {
    return `https://${link}`;
  }
  
  return link;
};