export enum OrderStatus {
  created = 'created',
  pending = 'pending',
  processing = 'processing',
  received = 'received',
  captured = 'captured',
  failed = 'failed',
  canceled = 'canceled',
}

interface OrderItem {
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  count: number;
  itemId: string;
}

interface OrderMeta {
  customer_id: string;
}

interface OrderTxnOut {
  hash: string;
}

interface OrderCustomerOut {
  wallet: string;
}

export interface OrderIn {
  title: string;
  orderId: string;
  currency: string;
  items: OrderItem[];
  meta: OrderMeta;
}

export interface OrderOut extends OrderIn {
  status: string;
  uuid: OrderStatus;
  created_At: string;
  amount: number;
  txn?: OrderTxnOut;
  customer?: OrderCustomerOut;
  testnet?: boolean;
}

export interface MerchantOut {
  title: string;
  image_url?: string;
}

export interface RegisterOut {
  order: OrderOut;
  merchant: MerchantOut;
}
