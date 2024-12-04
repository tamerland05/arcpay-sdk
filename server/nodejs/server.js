// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 1080;

app.use(express.raw({ type: 'application/json' }));

// Temporary order database
const shopDatabase = {};

// Webhook handler
app.post('/webhook', (req, res) => {
  const privateKey = process.env.PRIVATE_KEY;
  const signature = req.headers['x-signature'];
  const payload = req.body.toString();

  if (!signature) {
    return res.status(400).json({ error: 'Missing signature header' });
  }

  // Calculate HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', privateKey)
    .update(payload)
    .digest('hex');

  // Verify signature
  if (
    !crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    )
  ) {
    return res.status(403).json({ error: 'Invalid signature' });
  }

  const data = req.body;
  console.log('Webhook received:', data);

  // Handle order status change
  if (data.event === 'order.status.changed') {
    const orderId = data.data.uuid;
    const status = data.data.status;
    shopDatabase[orderId] = data.data; // Store or update order

    if (status === 'received') {
      console.log(`Order ${orderId} received successfully!`);
    }
  }

  res.status(200).json({ status: 'Webhook received successfully' });
});

// Order creation handler
app.post('/create', async (req, res) => {
  const arcKey = process.env.ARC_KEY;
  const url = 'https://arcpay.online/api/v1/arcpay/order';

  const orderData = {
    title: 'Premium Subscription Box',
    orderId: `INV-${new Date().toISOString().replace(/[-:.]/g, '')}`,
    currency: 'TON',
    items: [
      {
        title: 'Exclusive Travel Package',
        description:
          'A luxurious 5-day trip to Bali with first-class accommodation.',
        imageUrl:
          'https://www.luxurytravelmagazine.com/files/610/1/2901/Kayon-Jungle-aerial_reg.jpg',
        price: 0.5,
        count: 1,
        itemId: 'id-987654',
      },
      {
        title: 'Gourmet Dinner Experience',
        description:
          'A 7-course gourmet dinner at a Michelin-starred restaurant.',
        imageUrl:
          'https://www.luxurytravelmagazine.com/files/610/2/2572/Samabe-restaurant_big_reg.jpg',
        price: 0.15,
        count: 2,
        itemId: 'id-654321',
      },
    ],
    meta: {
      telegram_id: req.body.telegram_id || null,
    },
    captured: false,
  };

  try {
    const response = await axios.post(url, orderData, {
      headers: {
        'Content-Type': 'application/json',
        ArcKey: arcKey,
      },
    });

    // Log and return the result
    console.log('Order created successfully:', response.data);
    shopDatabase[response.data.uuid] = response.data; // Store order in database
    res.json(response.data);
  } catch (error) {
    console.error(
      'Failed to create order:',
      error.response ? error.response.data : error.message
    );
    res.status(error.response ? error.response.status : 500).json({
      error: 'Failed to create order',
    });
  }
});

// Endpoint to get the current shop database
app.get('/', (req, res) => {
  res.json(shopDatabase);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
