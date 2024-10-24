import { OrderOut } from '@arcpay/react-sdk/dist/types/order';
import OrderView from './OrderView';
import { useEffect, useState } from 'react';
import { useArcPay } from '@arcpay/react-sdk';

type Props = {
  orderId: string;
};
// Pay by link and tracking transaction from FE directly
function SimplePay({ orderId }: Props) {
  const arcPay = useArcPay();

  const [order, setOrder] = useState<OrderOut | undefined>();

  useEffect(() => {
    arcPay.onOrderChange(orderId, (o) => {
      console.log('order changed:', o);
      setOrder(o);
    });
  }, [orderId]);

  if (!order) {
    return <>Loading...</>;
  }

  return (
    <>
      <OrderView order={order} />

      {order.paymentUrl && (
        <button
          onClick={() => window.open(order.paymentUrl, '_blank', 'noreferrer')}>
          Pay ({order.amount} {order.currency})
        </button>
      )}
    </>
  );
}

export default SimplePay;
