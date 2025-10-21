export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  featured: boolean;
  quantity: number;
  in_stock: boolean;
  likes_count: number;
  category: string;
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
  whatsapp_number: string | null;
  whatsapp_link: string | null;
  whatsapp_message: string | null;
  instagram_username: string | null;
  instagram_link: string | null;
  facebook_username: string | null;
  facebook_link: string | null;
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