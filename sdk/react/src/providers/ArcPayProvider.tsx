import { TonConnectUIProvider } from "@tonconnect/ui-react";
import React, { createContext, ReactNode, useState } from "react";
import ArcpayStatus from "../types/arcpay";
import { OrderChangeCallback } from "../types/order";

interface OrderChangeInterface {
  callback: OrderChangeCallback;
  orderId: string;
}

// Define the context value type
interface ArcPayContextType {
  apiBaseUrl: string;
  status: ArcpayStatus;
  onOrderChange: (callback: OrderChangeCallback, orderId: string) => void;
}

// Create the context
export const ArcPayContext = createContext<ArcPayContextType | undefined>(
  undefined
);

type ArcPayProviderProps = {
  baseUrl?: string;
  children: ReactNode;
};

// ArcPayProvider component
export const ArcPayProvider = ({ children, baseUrl }: ArcPayProviderProps) => {
  const [orderCallbacks, setOrderCallbacks] = useState<OrderChangeInterface>(
    []
  );

  const [arcPayStatus, setArcPayStatus] = useState<ArcpayStatus>(
    ArcpayStatus.disconnected
  );

  const onOrderChange = (callback: OrderChangeCallback, orderId: string) => {
    setOrderCallbacks({
      callback: callback,
      orderId: orderId,
    });
  };
  const [apiBaseUrl, setApiBaseUrl] = useState(
    baseUrl || "https://arcpay.online/api/v1/arcpay"
  );

  return (
    <TonConnectUIProvider manifestUrl="https://arcpay.online/tonconnect-manifest.json">
      <ArcPayContext.Provider
        value={{
          status: arcPayStatus,
          apiBaseUrl: apiBaseUrl,
          onOrderChange: onOrderChange,
        }}
      >
        {children}
      </ArcPayContext.Provider>
    </TonConnectUIProvider>
  );
};
