import { useContext, useEffect, useState } from "react";
import { OrderChangeCallback, OrderOut } from "../types/order";
// import ArcpayStatus from '../types/arcpay';
import {
  useTonAddress,
  useTonConnectModal,
  useTonConnectUI,
} from "@tonconnect/ui-react";
import { ArcPayContext } from "../providers/ArcPayProvider";
import { arcPayApi } from "../services/api";
import ArcpayStatus from "../types/arcpay";

export function useArcPay(orderId?: string) {
  const context = useContext(ArcPayContext);
  const userFriendlyAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const { open } = useTonConnectModal();
  const [arcpayStatus, setArcpayStatus] = useState<ArcpayStatus>(
    ArcpayStatus.disconnected
  );

  if (!context) {
    throw new Error("useArcPay must be used within an ArcPayProvider");
  }

  useEffect(() => {
    if (userFriendlyAddress && arcpayStatus == ArcpayStatus.disconnected) {
      setArcpayStatus(ArcpayStatus.connected);
    } else if (!userFriendlyAddress) {
      setArcpayStatus(ArcpayStatus.disconnected);
    }
  }, [userFriendlyAddress]);

  return {
    arcPayStatus: arcpayStatus,
    getOrder: (uuid: string) => arcPayApi.getOrder,
    checkoutOrder: async (
      uuid: string,
      callback?: OrderChangeCallback
    ): Promise<OrderOut> => {
      if (arcpayStatus == ArcpayStatus.disconnected || !userFriendlyAddress) {
        throw new Error(`Wallet disconnected`);
      }

      const response = await arcPayApi.checkout(uuid, userFriendlyAddress);

      const messages = response["transactions"];
      const tonConnectResponse = await tonConnectUI.sendTransaction({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messages.map((tx: any) => {
          return {
            address: tx.to,
            amount: tx.value.toString(),
            payload: tx.body,
          };
        }),
        validUntil: Date.now() + 10 * 60 * 1000, // 10 minutes for user to approve
        // network: response['testnet'] ? CHAIN.TESTNET : CHAIN.MAINNET,
      });
      const confirm = arcPayApi.confirm(uuid, tonConnectResponse);
      return confirm;
    },
    connect: () => {
      return open();
    },
    disconnect: () => {
      if (!tonConnectUI) {
        throw new Error(`tonConnectUI not init`);
      }
      tonConnectUI.disconnect();
    },
  };
}
