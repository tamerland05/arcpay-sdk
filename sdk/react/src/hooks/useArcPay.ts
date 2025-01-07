import { useContext, useEffect, useRef, useState } from 'react';
import { OrderChangeCallback, OrderOut } from '../types/order';
// import ArcpayStatus from '../types/arcpay';
import {
  useTonAddress,
  useTonConnectModal,
  useTonConnectUI,
} from '@tonconnect/ui-react';
import { ArcPayContext } from '../providers/ArcPayProvider';
import { arcPayApi } from '../services/api';
import ArcpayStatus from '../types/arcpay';

export function useArcPay() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const context = useContext(ArcPayContext);
  const userFriendlyAddress = useTonAddress();
  const rawAddress = useTonAddress(false);
  const [tonConnectUI] = useTonConnectUI();
  const { open } = useTonConnectModal();
  const [arcpayStatus, setArcpayStatus] = useState<ArcpayStatus>(
    ArcpayStatus.disconnected
  );

  if (!context) {
    throw new Error('useArcPay must be used within an ArcPayProvider');
  }

  useEffect(() => {
    if (userFriendlyAddress && arcpayStatus == ArcpayStatus.disconnected) {
      setArcpayStatus(ArcpayStatus.connected);
    } else if (!userFriendlyAddress) {
      setArcpayStatus(ArcpayStatus.disconnected);
    }
  }, [userFriendlyAddress]);

  useEffect(() => {
    // Подключение к SSE-серверу
    if (!context.orderCallback) {
      return;
    }

    const eventSource = new EventSource(
      `${arcPayApi.baseUrl}/order/${context.orderCallback.uuid}/events`
    );

    eventSource.onmessage = (event) => {
      // console.log('Event from backend:', JSON.parse(event.data));
      const orderUpdate = JSON.parse(event.data) as OrderOut;
      if (context.orderCallback?.uuid == orderUpdate.uuid) {
        context.orderCallback.callback(orderUpdate);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Error with SSE connection:', error);
      // Закрытие соединения при ошибке
      eventSource.close();
    };

    eventSource.onopen = (error) => {
      // console.error('Error:', error);
    };

    // Сохраняем ссылку на EventSource для возможного отключения
    eventSourceRef.current = eventSource;

    // Очистка при размонтировании компонента
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [context.orderCallback, arcPayApi]);

  return {
    arcPayStatus: arcpayStatus,
    getOrder: (uuid: string) => arcPayApi.getOrder,
    pay: async (
      uuid: string,
      callback?: OrderChangeCallback
    ): Promise<OrderOut> => {
      if (arcpayStatus == ArcpayStatus.disconnected || !userFriendlyAddress) {
        throw new Error(`Wallet disconnected`);
      }
      const response = await arcPayApi.checkout(uuid, userFriendlyAddress);
      const messages = response['transactions'];
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
    walletAddress: () => rawAddress,
    onOrderChange: context.onOrderChange,
  };
}
