import { OrderIn, OrderOut, RegisterOut } from "../types/order";

const ARCPAY_URL =
  import.meta.env.VITE_ARCPAY_API_URL || "https://arcpay.online/api/v1/arcpay";

const fetchArcpay = async (
  url: string,
  method?: string,
  headers?: HeadersInit,
  body?: BodyInit | null
) => {
  const response = await fetch(`${ARCPAY_URL}${url}`, {
    method: method || "GET",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: body,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Error: ${errorData.message}`);
  } else {
    const result = await response.json();
    return result;
  }
};

export const arcPayApi = {
  getOrder: async (uuid: string): Promise<OrderOut | undefined> => {
    return await fetchArcpay(`/order/${uuid}`);
  },
  createOrder: async (
    orderData: OrderIn,
    merchantApiKey: string
  ): Promise<OrderOut> =>
    fetchArcpay(
      "/order",
      "POST",
      {
        ArcKey: merchantApiKey,
      },
      JSON.stringify(orderData)
    ),
  register: (
    uuid: string,
    initData: null,
    walletAddress: string
  ): Promise<RegisterOut> =>
    fetchArcpay(
      `/order/${uuid}/register`,
      "POST",
      {},
      JSON.stringify({
        initData: initData,
        walletAddress: walletAddress,
      })
    ),
  checkout: (uuid: string, customerWalletAddress?: string) =>
    fetchArcpay(
      `/order/${uuid}/checkout`,
      "POST",
      {},
      JSON.stringify({
        customerWalletAddress: customerWalletAddress,
      })
    ),
  confirm: (uuid: string, tonConnectResponse?: any) =>
    fetchArcpay(
      `/order/${uuid}/confirm`,
      "POST",
      {},
      JSON.stringify({
        tonConnectResponse,
      })
    ),
};
