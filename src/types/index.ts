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
  category: string | null;
  collection_id: string | null;
  display_order: number | null;
  brand: string | null;
  sku: string | null;
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

export interface Review {
  id: string;
  product_id: string;
  user_id: string | null;
  rating: number;
  review_text: string | null;
  reviewer_name: string;
  reviewer_email: string | null;
  images: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  display_order: number | null;
  icon: string | null;
  image_url: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  display_order: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  product_id: string;
  category_id: string;
  display_order: number | null;
  created_at: string;
}
