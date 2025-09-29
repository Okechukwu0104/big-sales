export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  featured: boolean;
  quantity: number;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  order_items: CartItem[];
  total_amount: number;
  status: 'new' | 'processing' | 'shipped' | 'delivered';
  created_at: string;
  updated_at: string;
}

export interface StoreConfig {
  id: string;
  payment_details: string | null;
  // Change these field names:
  whatsapp_number: string | null;  // instead of whatsapp_link
  instagram_username: string | null; // instead of instagram_link  
  facebook_username: string | null; // instead of facebook_link
  selected_country: string | null;
  currency_code: string | null;
  currency_symbol: string | null;
  created_at: string;
  updated_at: string;
}

export interface AfricanCountry {
  id: string;
  name: string;
  currency_code: string;
  currency_symbol: string;
  created_at: string;
}