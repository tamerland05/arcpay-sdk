import { useState } from 'react';
import { api } from '../api';
import SimplePay from './SimplePay';
import IntegratedPay from './IntegratedPay';
import { OrderOut } from '@arcpay/react-sdk';

enum PaymentMode {
  simple = 'simple',
  integrated = 'integrated',
}

function Pay() {
  const [paymentMode, setPaymentMode] = useState<PaymentMode | undefined>();
  const [order, setOrder] = useState<OrderOut | undefined>();

  if (!order) {
    return (
      <>
        <button
          onClick={() => {
            api
              .createOrder(123)
              .then((response) => response.json())
              .then((data) => setOrder(data as OrderOut));
          }}>
          Create Order
        </button>
      </>
    );
  }

  return (
    <>
      {!paymentMode && (
        <>
          <button onClick={() => setPaymentMode(PaymentMode.simple)}>
            Simple payment
          </button>{' '}
          <button onClick={() => setPaymentMode(PaymentMode.integrated)}>
            Integrated payment
          </button>
        </>
      )}
      {paymentMode == PaymentMode.simple && <SimplePay orderId={order.uuid} />}

      {paymentMode == PaymentMode.integrated && (
        <IntegratedPay orderId={order.uuid} />
      )}
    </>
  );
}

export default Pay;
