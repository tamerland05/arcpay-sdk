const backend_url = 'http://localhost:1080';

export const api = {
  createOrder: (userId: number) =>
    fetch(`${backend_url}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
      }),
    }),
};
