import { TonConnectUIProvider } from '@tonconnect/ui-react';
import React, { createContext, ReactNode, useState } from 'react';
import ArcpayStatus from '../types/arcpay';
import { OrderChangeCallback } from '../types/order';

interface OrderChangeInterface {
  callback: OrderChangeCallback;
  uuid: string;
}

// Define the context value type
interface ArcPayContextType {
  status: ArcpayStatus;
  orderCallback?: OrderChangeInterface;
  onOrderChange: (uuid: string, callback: OrderChangeCallback) => void;
}

// Create the context
export const ArcPayContext = createContext<ArcPayContextType | undefined>(
  undefined
);

type ArcPayProviderProps = {
  children: ReactNode;
};

// ArcPayProvider component
export const ArcPayProvider = ({ children }: ArcPayProviderProps) => {
  const [orderCallback, setOrderCallback] = useState<
    OrderChangeInterface | undefined
  >();

  const [arcPayStatus, setArcPayStatus] = useState<ArcpayStatus>(
    ArcpayStatus.disconnected
  );

  const onOrderChange = (uuid: string, callback: OrderChangeCallback) => {
    setOrderCallback({
      callback: callback,
      uuid: uuid,
    });
  };
  return (
    <TonConnectUIProvider manifestUrl="https://arcpay.online/tonconnect-manifest.json">
      <ArcPayContext.Provider
        value={{
          status: arcPayStatus,
          onOrderChange: onOrderChange,
          orderCallback: orderCallback,
        }}>
        {children}
      </ArcPayContext.Provider>
    </TonConnectUIProvider>
  );
};
