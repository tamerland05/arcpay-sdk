import { TonConnectUIProvider } from '@tonconnect/ui-react';
import React, { createContext, ReactNode, useState } from 'react';
import { OrderOut } from '../types/order';

type OrderChangeCallback = (order: OrderOut) => void;

// Define the context value type
interface ArcPayContextType {
  processPayment: (amount: number) => Promise<void>;
  apiBaseUrl: string;
  onOrderChange: (callback: OrderChangeCallback) => void;
}

// Create the context
export const ArcPayContext = createContext<ArcPayContextType | undefined>(
  undefined
);

type ArcPayProviderProps = {
  apiBaseUrl?: string;
  children: ReactNode;
};

// ArcPayProvider component
export const ArcPayProvider = ({
  children,
  apiBaseUrl,
}: ArcPayProviderProps) => {
  const [orderCallbacks, setOrderCallbacks] = useState<OrderChangeCallback[]>(
    []
  );

  const onOrderChange = (callback: OrderChangeCallback) => {
    setOrderCallbacks((prevCallbacks) => [...prevCallbacks, callback]);
  };

  const [isProcessing, setIsProcessing] = useState(false);
  const [baseUrl, setBaseUrl] = useState(
    apiBaseUrl || 'https://arcpay.online/api/v1/arcpay'
  );

  const processPayment = async (amount: number) => {
    setIsProcessing(true);
    // Simulate payment processing using ArcPay API
    console.log(`Processing payment of ${amount} with ArcPay...`);
    // Add your payment API logic here
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
  };

  return (
    <TonConnectUIProvider manifestUrl="https://arcpay.online/tonconnect-manifest.json">
      <ArcPayContext.Provider
        value={{
          processPayment,
          apiBaseUrl: apiBaseUrl || '',
          onOrderChange: onOrderChange,
        }}>
        {children}
      </ArcPayContext.Provider>
    </TonConnectUIProvider>
  );
};
