import { TonConnectUI, useTonConnectUI } from '@tonconnect/ui-react';

export const getTonConnectInstance = (): TonConnectUI | null => {
  const [tonConnectInstance] = useTonConnectUI();
  return tonConnectInstance;
};
