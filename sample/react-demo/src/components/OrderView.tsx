import { OrderOut, OrderStatus } from '@arcpay/react-sdk/dist/types/order';
import React from 'react';

interface OrderViewProps {
  order: OrderOut;
}

const OrderView: React.FC<OrderViewProps> = ({ order }) => {
  return (
    <div className="order-view">
      <h2>Order Details</h2>
      <p>
        <strong>Order ID:</strong> {order.orderId} ({order.uuid})
      </p>
      <p>
        <strong>Status:</strong> {OrderStatus[order.status]}
      </p>
      <p>
        <strong>Created At:</strong>{' '}
        {new Date(order.createdAt).toLocaleString()}
      </p>
      <p>
        <strong>Amount:</strong> {order.amount} {order.currency}
      </p>
      <p>
        <strong>Testnet:</strong> {order.testnet ? 'Yes' : 'No'}
      </p>

      {order.customer && (
        <div className="customer-info">
          <h3>Customer Information</h3>
          <p>
            <strong>Wallet:</strong> {order.customer.wallet}
          </p>
        </div>
      )}

      {order.txn && (
        <div className="txn-info">
          <h3>Transaction Information</h3>
          <p>
            <strong>Transaction ID:</strong>{' '}
            <a
              target="_blank"
              href={`https://${
                order.testnet ? 'testnet.' : ''
              }tonviewer.com/transaction/${order.txn.hash}`}>
              {order.txn.hash}
            </a>
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderView;
