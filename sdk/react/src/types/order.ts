/**
 * Enum representing the possible statuses of an order.
 *
 * @enum {string}
 */
export enum OrderStatus {
  /** The order has been created but not processed yet */
  created = 'created',

  /** The order is pending for further action */
  pending = 'pending',

  /** The order is being processed */
  processing = 'processing',

  /** The order has been received by the customer */
  received = 'received',

  /** The order has been captured (i.e., the payment has been finalized) */
  captured = 'captured',

  /** The order has failed (i.e., payment or processing error) */
  failed = 'failed',

  /** The order has been canceled */
  canceled = 'canceled',
}

/**
 * Interface representing an item in an order.
 *
 * @interface
 */
interface OrderItem {
  /** The title of the item */
  title: string;

  /** A brief description of the item */
  description: string;

  /** The URL of the item's image */
  imageUrl: string;

  /** The price of the item (per unit) */
  price: number;

  /** The number of units of the item in the order */
  count: number;

  /** The unique identifier for the item */
  itemId: string;
}

/**
 * Interface representing metadata associated with an order.
 *
 * @interface
 */
interface OrderMeta {
  /** The unique identifier of the customer placing the order */
  customer_id: string;
}

/**
 * Interface representing transaction details of an outgoing order.
 *
 * @interface
 */
interface OrderTxnOut {
  /** The hash of the transaction related to the order */
  hash: string;
}

/**
 * Interface representing customer details of an outgoing order.
 *
 * @interface
 */
interface OrderCustomerOut {
  /** The wallet address of the customer */
  wallet: string;
}

/**
 * Interface representing the structure of an incoming order.
 *
 * @interface
 */
export interface OrderIn {
  /** The title of the order */
  title: string;

  /** The unique identifier for the order */
  orderId: string;

  /** The currency used for the order (e.g., USD, EUR) */
  currency: string;

  /** The list of items in the order */
  items: OrderItem[];

  /** Metadata associated with the order */
  meta: OrderMeta;
}

/**
 * Interface representing the structure of an outgoing order.
 *
 * @extends {OrderIn}
 */
export interface OrderOut extends OrderIn {
  /** The current status of the order from the `OrderStatus` enum */
  status: OrderStatus;

  /** The unique identifier for the order's */
  uuid: string;

  /** The timestamp when the order was created */
  createdAt: string;

  /** The total amount of the order */
  amount: number;

  /** (Optional) Transaction details of the order */
  txn?: OrderTxnOut;

  /** (Optional) Customer details of the order */
  customer?: OrderCustomerOut;

  /** Indicates if the order is in a testnet environment */
  testnet: boolean;
}

/**
 * Interface representing merchant details.
 *
 * @interface
 */
export interface MerchantOut {
  /** The title of the merchant */
  title: string;

  /** (Optional) The URL of the merchant's image */
  imageUrl?: string;
}

/**
 * Interface representing the result of a registration or order process.
 *
 * @interface
 */
export interface RegisterOut {
  /** The details of the order */
  order: OrderOut;

  /** The details of the merchant associated with the order */
  merchant: MerchantOut;
}
