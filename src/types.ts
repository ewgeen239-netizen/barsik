export type Category =
  | 'iphone'
  | 'samsung'
  | 'laptop'
  | 'tablet'
  | 'watch'
  | 'airpods'
  | 'accessory';

export type Condition = 'excellent' | 'good' | 'used';

export type ProductStatus = 'available' | 'reserved' | 'sold';

export type Product = {
  id: string;
  category: Category;
  brand: string;
  model: string;
  memory?: string;
  condition: Condition;
  description: string;
  price: number;
  /** Стара ціна — заповнюється лише для товарів в "Акціях" */
  oldPrice?: number;
  warranty: string;
  kit: string;
  status: ProductStatus;
  photoUrl?: string;
  createdAt: string;
};

export type OrderType = 'booking' | 'purchase';

export type Order = {
  id: string;
  type: OrderType;
  productId: string;
  productTitle: string;
  customerName: string;
  phone: string;
  delivery: 'delivery' | 'pickup';
  comment?: string;
  userId: number;
  username?: string;
  createdAt: string;
  status: 'new' | 'processed';
};

export type TradeIn = {
  id: string;
  model: string;
  memory: string;
  condition: string;
  hasBox: boolean;
  photoFileId?: string;
  phone: string;
  userId: number;
  username?: string;
  createdAt: string;
  status: 'new' | 'processed';
};
