import OrderView from './OrderView';
import { useEffect, useState } from 'react';
import { OrderOut, useArcPay } from '@arcpay/react-sdk';
import ArcpayStatus from '@arcpay/react-sdk/dist/types/arcpay';

type Props = {
  orderId: string;
};
// Pay by link and tracking transaction from FE directly
function IntegratedPay({ orderId }: Props) {
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

      {arcPay.arcPayStatus == ArcpayStatus.disconnected && (
        <button onClick={() => arcPay.connect()}>Connect wallet</button>
      )}

      {arcPay.arcPayStatus == ArcpayStatus.connected && (
        <>
          <button
            onClick={async () => {
              const order_info = await arcPay.pay(orderId);
              console.log(order_info);
            }}>
            Pay ({order.amount} {order.currency})
          </button>
          <button onClick={() => arcPay.disconnect()}>Disconnect wallet</button>
        </>
      )}
    </>
  );
}

export default IntegratedPay;
